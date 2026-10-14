<?php
/**
 * Cart Manager — manages the WooCommerce cart and checkout pipeline.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Core
 */

namespace Opopw\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Opopw\Data\DbManager;
use Opopw\Fields\FieldFactory;
use Opopw\Helper\ConditionEvaluator;
use Opopw\Helper\WooCommerce;
use Opopw\Pricing\PricingEngine;

/**
 * Cart Manager — manages the WooCommerce cart and checkout pipeline.
 *
 * Implements the 5 core stages:
 *  1. Validation (before add to cart)
 *  2. Add item data (store in cart session, calculate prices/weights)
 *  3. Calculate totals (apply math to cart)
 *  4. Get item data (display in cart/checkout)
 *  5. Order line item (save to DB on checkout)
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Core
 */
class CartManager extends Base {



	/**
	 * Unique key used to store data in the WC Cart item.
	 */
	const CART_KEY = 'opopw_addons';

	/**
	 * Order-item meta key holding the per-intent stock ledger.
	 *
	 * Shape: array(
	 *     'authorised_refunded' => float,   // qty refunded WITH restock approved
	 *     'intents' => array( $index => array( 'consumed' => float, 'released' => float ) ),
	 * )
	 *
	 * Replaces the old boolean `_opopw_stock_restored`, which could not express
	 * partial restoration and never reset, so a cancel/reinstate/cancel cycle
	 * leaked stock permanently.
	 *
	 * @since 1.0.3
	 */
	const LEDGER_META = '_opopw_stock_ledger';

	/**
	 * Legacy boolean meta, still read for orders placed before 1.0.3.
	 *
	 * There is no migration mechanism in this plugin, so this dual-read is
	 * permanent.
	 *
	 * @since 1.0.3
	 */
	const LEGACY_RESTORED_META = '_opopw_stock_restored';

	/**
	 * Flag to prevent infinite loops in totals calculation.
	 *
	 * @var bool
	 */
	public static $already_run_calculate_totals = false;

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since 1.0.0
	 * @param object $plugin The main plugin instance.
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();

		// Stage 1: Validation
		$loader->add_filter( 'woocommerce_add_to_cart_validation', $this, 'validate_add_to_cart', 10, 3 );
		$loader->add_filter( 'woocommerce_update_cart_validation', $this, 'validate_update_cart', 10, 4 );
		$loader->add_action( 'woocommerce_after_checkout_validation', $this, 'validate_checkout_stock', 10, 2 );
		$loader->add_action( 'woocommerce_after_cart_item_quantity_update', $this, 'after_cart_item_quantity_update', 10, 4 );

		// Stage 2: Add cart item data (Process & Math)
		$loader->add_filter( 'woocommerce_add_cart_item_data', $this, 'add_cart_item_data', 10, 3 );

		// Stage 3: Calculate totals
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'calculate_totals' ), 1, 1 );

		// Stage 4: Cart & Checkout display
		$loader->add_filter( 'woocommerce_get_item_data', $this, 'get_item_data', 10, 2 );

		// Stage 5: Order meta storage
		$loader->add_action( 'woocommerce_checkout_create_order_line_item', $this, 'add_order_item_meta', 10, 4 );

		// Stock Management
		$loader->add_action( 'woocommerce_reduce_order_stock', $this, 'reduce_inventory_stock', 10, 1 );

		// Release the whole line: WooCommerce treats cancelled and pending as
		// restock triggers for its own stock (wc-stock-functions.php:155-156).
		//
		// Priority 9, and it is load-bearing. get_item_ledger() has to know
		// whether this order's stock was ever actually reduced before it will
		// hand any back, and the only signal is core's own '_order_stock_reduced'
		// — which core CLEARS in wc_maybe_increase_stock_levels, registered on
		// these same two hooks at priority 10. Core registers at file-load time,
		// before this plugin registers on plugins_loaded, so at an equal priority
		// core would always win and the flag would always read false: the guard
		// would silently invert to "never release anything".
		$loader->add_action( 'woocommerce_order_status_cancelled', $this, 'restore_order_stock', 9, 1 );
		$loader->add_action( 'woocommerce_order_status_pending', $this, 'restore_order_stock', 9, 1 );

		// Partial release on refund. This filter is the only viable hook: the
		// per-item 'woocommerce_restock_refunded_item' action fires past a
		// `! $product->managing_stock()` guard (wc-order-functions.php:824), and
		// our pools are independent of whether the product manages stock at all,
		// so for a simple non-stock-managed product it would never fire.
		$loader->add_filter( 'woocommerce_can_restock_refunded_items', $this, 'restore_refunded_stock', 10, 3 );

		// Helper: Ensure edit-in-cart works
		$loader->add_filter( 'woocommerce_add_cart_item', $this, 'load_cart_item_data', 1, 1 );
	}


	/**
	 * Get groups assigned to a product (re-uses existing cached logic).
	 *
	 * This function is a dispatcher that checks for all applicable campaign types and returns the group ids.
	 *
	 * @since 1.0.0
	 * @param int $product_id The product ID to fetch groups for.
	 * @return array
	 */
	private function get_groups_for_product( int $product_id ) {
		$cache_key = 'opopw_assignments_product_' . $product_id;
		$cached    = wp_cache_get( $cache_key, 'optionbay-product-options-addons-woo' );

		if ( false !== $cached ) {
			return $cached;
		}

		$category_ids = WooCommerce::get_product_cat_ids( $product_id );
		$tag_ids      = WooCommerce::get_product_tag_ids( $product_id );

		$group_ids = DbManager::get_instance()->get_groups_for_product(
			$product_id,
			$category_ids,
			$tag_ids
		);

		wp_cache_set( $cache_key, $group_ids, 'optionbay-product-options-addons-woo', 300 );

		return $group_ids;
	}

	/**
	 * Get group schema from post meta.
	 *
	 * @since 1.0.0
	 * @param int $group_id The option group post ID.
	 * @return array The JSON-decoded schema array.
	 */
	private function get_group_schema( int $group_id ) {
		$cache_key = 'opopw_schema_group_' . $group_id;
		$cached    = wp_cache_get( $cache_key, 'optionbay-product-options-addons-woo' );

		if ( false !== $cached ) {
			return $cached;
		}

		$raw    = get_post_meta( $group_id, AddonGroup::META_SCHEMA, true );
		$schema = json_decode( $raw, true );

		if ( ! is_array( $schema ) ) {
			$schema = array();
		}

		wp_cache_set( $cache_key, $schema, 'optionbay-product-options-addons-woo', 600 );

		return $schema;
	}

	/**
	 * Validate product options before adding to cart.
	 *
	 * @since 1.0.0
	 * @param bool $passed     Whether validation passed.
	 * @param int  $product_id The product ID.
	 * @param int  $quantity   The quantity being added.
	 * @return bool
	 */
	public function validate_add_to_cart( $passed, $product_id, $quantity ) {
		if ( ! $passed ) {
			return $passed;
		}

		$group_ids = $this->get_groups_for_product( $product_id );
		if ( empty( $group_ids ) ) {
			return $passed;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$submitted_data = isset( $_REQUEST['opopw_addons'] ) ? wp_unslash( (array) $_REQUEST['opopw_addons'] ) : array();
		// 1. Stock Validation
		$intents = $this->collect_intents_from_request( $product_id, $quantity, $submitted_data );

		foreach ( $intents as $inv_id => $amount ) {
			if ( ! $this->check_stock_availability( $inv_id, $amount ) ) {
				$inv = \Opopw\Data\InventoryManager::get_instance()->get_item( $inv_id );
				/* translators: 1: inventory pool name, 2: remaining stock amount */
				wc_add_notice( sprintf( __( 'Insufficient stock for "%1$s". Only %2$s remaining.', 'optionbay-product-options-addons-woo' ), $inv['name'], floatval( $inv['stock_count'] - $this->get_cart_reserved_stock( $inv_id ) ) ), 'error' );
				return false;
			}
		}

		// 2. Field Validation
		foreach ( $group_ids as $group_id ) {
			$schema     = $this->get_group_schema( $group_id );
			$group_data = $submitted_data[ $group_id ] ?? array();

			foreach ( $schema as $field_schema ) {
				if ( ! ConditionEvaluator::is_visible( $field_schema, $group_data, $schema ) ) {
					continue;
				}

				$field = FieldFactory::create( $group_id, $field_schema );
				if ( ! $field ) {
					continue;
				}

				$field_id = $field_schema['id'];
				$value    = $group_data[ $field_id ] ?? null;

				$value = apply_filters( 'opopw_cart_validate_field_value', $value, $field_schema, $group_id );

				$result = $field->validate( $value );
				if ( is_wp_error( $result ) ) {
					wc_add_notice( $result->get_error_message(), 'error' );
					return false;
				}
			}
		}

		return $passed;
	}

	/**
	 * Validate stock when updating cart quantities.
	 *
	 * @since 1.0.0
	 */
	/**
	 * Validate stock when updating cart quantities.
	 *
	 * @since 1.0.0
	 * @param bool   $passed        Whether validation passed.
	 * @param string $cart_item_key The cart item key.
	 * @param array  $values        The cart item values.
	 * @param int    $quantity      The new quantity.
	 * @return bool
	 */
	public function validate_update_cart( $passed, $cart_item_key, $values, $quantity ) {
		if ( ! $passed || ! isset( $values[ self::CART_KEY ]['fields'] ) ) {
			return $passed;
		}

		$intents = array();
		foreach ( $values[ self::CART_KEY ]['fields'] as $field ) {
			if ( ! empty( $field['reduction_intents'] ) ) {
				foreach ( $field['reduction_intents'] as $intent ) {
					$inv_id             = $intent['id'];
					$amount             = $this->calculate_total_intent_reduction( $intent, $quantity );
					$intents[ $inv_id ] = ( $intents[ $inv_id ] ?? 0 ) + $amount;
				}
			}
		}

		foreach ( $intents as $inv_id => $amount ) {
			// Subtract the current cart item's reserved stock to avoid self-blocking
			$reserved_others = \Opopw\Data\InventoryManager::get_instance()->get_cart_reserved_stock( $inv_id, $cart_item_key );
			$inv             = \Opopw\Data\InventoryManager::get_instance()->get_item( $inv_id );

			if ( ! $inv ) {
				continue;
			}

			$stock_count      = floatval( $inv['stock_count'] );
			$allow_backorders = (bool) $inv['allow_backorders'];
			$available        = $stock_count - $reserved_others;

			if ( ! $allow_backorders && $available < $amount ) {
				/* translators: %s: inventory pool name */
				wc_add_notice( sprintf( __( 'Cannot update quantity for "%s". Insufficient stock.', 'optionbay-product-options-addons-woo' ), $inv['name'] ), 'error' );
				return false;
			}
		}

		return $passed;
	}




	/**
	 * Handle quantity updates for Block themes/Store API where filters might be bypassed.
	 *
	 * @since 1.0.0
	 * @param string   $cart_item_key The cart item key.
	 * @param int      $quantity      The new quantity.
	 * @param int      $old_quantity  The old quantity.
	 * @param \WC_Cart $cart          The cart object.
	 * @throws \Exception When stock is insufficient during a Store API request.
	 */
	public function after_cart_item_quantity_update( $cart_item_key, $quantity, $old_quantity, $cart ) {

		static $is_reverting = false;
		if ( $is_reverting ) {
			return;
		}

		$cart_item = $cart->get_cart_item( $cart_item_key );
		if ( isset( $cart_item[ self::CART_KEY ]['fields'] ) ) {

			$intents = array();
			foreach ( $cart_item[ self::CART_KEY ]['fields'] as $field ) {
				if ( ! empty( $field['reduction_intents'] ) ) {
					foreach ( $field['reduction_intents'] as $intent ) {
						$inv_id             = $intent['id'];
						$amount             = $this->calculate_total_intent_reduction( $intent, $quantity );
						$intents[ $inv_id ] = ( $intents[ $inv_id ] ?? 0 ) + $amount;
					}
				}
			}

			foreach ( $intents as $inv_id => $amount ) {
				// Subtract the current cart item's reserved stock to avoid self-blocking
				$reserved_others = \Opopw\Data\InventoryManager::get_instance()->get_cart_reserved_stock( $inv_id, $cart_item_key );
				$inv             = \Opopw\Data\InventoryManager::get_instance()->get_item( $inv_id );

				if ( ! $inv ) {
					continue;
				}

				$stock_count      = floatval( $inv['stock_count'] );
				$allow_backorders = $inv['allow_backorders'] ? intval( $inv['allow_backorders'] ) : 0;
				$available        = $stock_count - $reserved_others;

				if ( ! $allow_backorders && $available < $amount ) {

					$is_reverting = true;
					$cart->set_quantity( $cart_item_key, $old_quantity, true );
					$is_reverting = false;

					/* translators: %s: inventory pool name */
					$message = sprintf( __( 'Cannot update quantity for "%s". Insufficient stock.', 'optionbay-product-options-addons-woo' ), $inv['name'] );
					wc_add_notice( $message, 'error' );

					// For Store API, we might need to throw an exception to stop execution and show error
					if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
						// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
						throw new \Exception( $message );
					}

					return false;
				}
			}
		}
	}

	/**
	 * Final stock check before checkout processing.
	 *
	 * @since 1.0.0
	 */
	/**
	 * Final stock check before checkout processing.
	 *
	 * @since 1.0.0
	 * @param array     $data   The checkout data.
	 * @param \WP_Error $errors The checkout errors.
	 */
	public function validate_checkout_stock( $data, $errors ) {
		opopw_log( 'CartManager: Running checkout stock validation.', 'DEBUG' );
		$cart   = WC()->cart->get_cart();
		$totals = array();

		foreach ( $cart as $item ) {
			if ( ! isset( $item[ self::CART_KEY ]['fields'] ) ) {
				continue;
			}
			foreach ( $item[ self::CART_KEY ]['fields'] as $field ) {
				if ( ! empty( $field['reduction_intents'] ) ) {
					foreach ( $field['reduction_intents'] as $intent ) {
						$inv_id            = $intent['id'];
						$amount            = $this->calculate_total_intent_reduction( $intent, $item['quantity'] );
						$totals[ $inv_id ] = ( $totals[ $inv_id ] ?? 0 ) + $amount;
					}
				}
			}
		}

		foreach ( $totals as $inv_id => $amount ) {
			$inv = \Opopw\Data\InventoryManager::get_instance()->get_item( $inv_id );
			if ( $inv && ! $inv['allow_backorders'] && $inv['stock_count'] < $amount ) {
				opopw_log( sprintf( 'CartManager: ERROR: Out of stock validation failure for inventory "%s" (ID %d). Available: %f, Requested: %f', $inv['name'], $inv_id, $inv['stock_count'], $amount ), 'ERROR' );
				/* translators: %s: inventory pool name */
				$errors->add( 'out_of_stock', sprintf( __( 'Insufficient stock for "%s". Please reduce quantity.', 'optionbay-product-options-addons-woo' ), $inv['name'] ) );
			}
		}
	}

	/**
	 * Stage 2: Add cart item data (Session storage & Math)
	 *
	 * Stores the verified user choices into the WooCommerce cart session securely,
	 * handling formatting and sanitization before committing to session.
	 *
	 * Extensions may transform a value here via `opopw_cart_process_field_value`
	 * — that is where the Pro add-on performs its file uploads, and where an
	 * upload failure surfaces as an exception.
	 *
	 * Hook: woocommerce_add_cart_item_data
	 *
	 * @since 1.0.0
	 * @param array $cart_item_data The cart item data structure.
	 * @param int   $product_id     The product ID.
	 * @param int   $variation_id   The variation ID.
	 * @return array Modified cart item data.
	 */
	public function add_cart_item_data( $cart_item_data, $product_id, $variation_id ) {
		$group_ids = $this->get_groups_for_product( $product_id );
		if ( empty( $group_ids ) ) {
			return $cart_item_data;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended, WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$submitted_data = isset( $_REQUEST['opopw_addons'] ) ? wp_unslash( (array) $_REQUEST['opopw_addons'] ) : array();
		// phpcs:enable

		$session_data          = array();
		$total_price_addition  = 0.0;
		$total_weight_addition = 0.0;

		foreach ( $group_ids as $group_id ) {
			$schema     = $this->get_group_schema( $group_id );
			$group_data = $submitted_data[ $group_id ] ?? array();

			foreach ( $schema as $field_schema ) {
				$field_id = $field_schema['id'] ?? 'unknown_id';

				if ( ! ConditionEvaluator::is_visible( $field_schema, $group_data, $schema ) ) {
					continue;
				}

				// Presentational fields carry no value; ignore forged submissions.
				if ( in_array( $field_schema['type'] ?? '', opopw_get_presentational_field_types(), true ) ) {
					continue;
				}

				$field = FieldFactory::create( $group_id, $field_schema );
				if ( ! $field ) {
					continue;
				}

				$value = $group_data[ $field_id ] ?? null;

				$value = apply_filters( 'opopw_cart_process_field_value', $value, $field_schema, $group_id );

				// Only save non-empty values
				if ( null !== $value && '' !== $value ) {
					$sanitized_value = $field->sanitize( $value );
					$session_entry   = array(
						'group_id'      => $group_id,
						'field_id'      => $field_id,
						'name'          => $field_schema['label'] ?? $field_schema['id'],
						'value'         => $sanitized_value,
						'display_value' => $field->get_display_value( $sanitized_value ),
						'field_type'    => $field_schema['type'],
						'weight'        => $field->get_weight( $sanitized_value ),
					);

					$intents = array();
					if ( ! empty( $field_schema['enable_stock'] ) && ! empty( $field_schema['inventory_id'] ) ) {
						$intent    = array(
							'id'     => $field_schema['inventory_id'],
							'mode'   => $field_schema['reduction_mode'] ?? 'per_item_qty',
							'value'  => $sanitized_value,
							'amount' => 1.0, // Base unit
						);
						$intent    = apply_filters( 'opopw_stock_reduction_intent', $intent, $field_schema, $sanitized_value );
						$intents[] = $intent;
					}

					if ( in_array( $field_schema['type'], array( 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch' ), true ) ) {
						$values_array = is_array( $sanitized_value ) ? $sanitized_value : array( $sanitized_value );
						foreach ( $field_schema['options'] ?? array() as $opt ) {
							if ( in_array( $opt['value'], $values_array, true ) && ! empty( $opt['enable_stock'] ) && ! empty( $opt['inventory_id'] ) ) {
								$intent    = array(
									'id'     => $opt['inventory_id'],
									'mode'   => $opt['reduction_mode'] ?? 'per_item_qty',
									'value'  => $opt['value'],
									'amount' => 1.0,
								);
								$intent    = apply_filters( 'opopw_stock_reduction_intent', $intent, $opt, $opt['value'] );
								$intents[] = $intent;
							}
						}
					}

					if ( ! empty( $intents ) ) {
						$session_entry['reduction_intents'] = $intents;
					}

					// Store raw data for display and Order meta
					$session_data[] = $session_entry;
				}
			}
		}

		if ( ! empty( $session_data ) ) {
			// Save to cart item data
			$cart_item_data[ self::CART_KEY ] = apply_filters(
				'opopw_cart_item_data',
				array(
					'fields' => $session_data,
				),
				$product_id,
				$variation_id
			);

			// Force unique cart item key so different options don't merge
			$cart_item_data['unique_key'] = md5( microtime() . wp_rand() );
		}

		return $cart_item_data;
	}

	/**
	 * Stage 3: Price/weight modification
	 *
	 * Takes the cart items, inspects OptionBay - Product Options and Addons metadata inside them, calculates the additional costs
	 * via the Strategy-powered PricingEngine, and sets the updated total back on the product instance.
	 *
	 * Hook: woocommerce_before_calculate_totals
	 *
	 * @since 1.0.0
	 * @param \WC_Cart $cart_object The WooCommerce Cart object.
	 * @return void
	 */
	public function calculate_totals( $cart_object ) {
		remove_action( 'woocommerce_before_calculate_totals', array( $this, 'calculate_totals' ), 1 );

		if ( self::$already_run_calculate_totals ) {
			return;
		}
		self::$already_run_calculate_totals = true;

		// Allow extensions to skip recalculation during an AJAX add-to-cart.
		if ( wp_doing_ajax() && ! did_action( 'woocommerce_calculate_totals' )
			&& ! apply_filters( 'opopw_ajax_calculate_totals', true ) ) {
			return;
		}

		// Ensure we don't recurse if our own plugin triggers price checks causing an infinite loop
		static $is_calculating = false;
		if ( $is_calculating ) {
			return;
		}
		$is_calculating = true;
		foreach ( $cart_object->get_cart() as $cart_item_key => $cart_item ) {
			// Skip products that don't have our custom fields in the cart item session
			if ( ! isset( $cart_item[ self::CART_KEY ] ) || empty( $cart_item[ self::CART_KEY ]['fields'] ) ) {
				continue;
			}

			$product               = $cart_item['data'];
			$base_price            = (float) $product->get_price( '' );
			$raw_regular_price     = $product->get_regular_price( '' );
			$raw_sale_price        = $product->get_sale_price( '' );
			$regular_price         = (float) $raw_regular_price;
			$sale_price            = (float) $raw_sale_price;
			$total_price_addition  = 0.0;
			$total_weight_addition = 0.0;

			// Loop through all OptionBay - Product Options and Addons fields stored for this given cart item
			foreach ( $cart_item[ self::CART_KEY ]['fields'] as &$field_data ) {
				$total_weight_addition += $field_data['weight'];

				$group_id = $field_data['group_id'] ?? 0;
				$field_id = $field_data['field_id'] ?? '';
				if ( ! $group_id || ! $field_id ) {
					continue;
				}

				// Safety check: ensure the group is still published
				if ( 'publish' !== get_post_status( $group_id ) ) {
					continue;
				}

				// We must re-fetch the raw schema configuration to run pricing because configuration could be complex
				$schema       = $this->get_group_schema( $group_id );
				$field_schema = null;
				foreach ( $schema as $s ) {
					if ( $s['id'] === $field_id ) {
						$field_schema = $s;
						break;
					}
				}

				if ( ! $field_schema ) {
					continue;
				}

				$qty = $cart_item['quantity'];

				// Calculate price dynamically based on field type and Pricing Strategy Context
				if ( in_array( $field_schema['type'], array( 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch' ), true ) ) {
					$options = $field_schema['options'] ?? array();
					$values  = is_array( $field_data['value'] ) ? $field_data['value'] : array( $field_data['value'] );
					// Each selected option is priced once, however often it was submitted.
					$values = array_values( array_unique( $values, SORT_REGULAR ) );

					foreach ( $values as $val ) {
						foreach ( $options as $opt ) {
							if ( $opt['value'] === $val ) {
								$p_type   = $opt['price_type'] ?? 'flat';
								$p_amount = (float) ( $opt['price'] ?? 0 );

								$opt_config            = array_merge( (array) $opt, array( '_opopw_price_context' => 'option' ) );
								$price_delta           = PricingEngine::calculate( $p_type, $base_price, $p_amount, $val, $qty, $opt_config );
								$total_price_addition += $price_delta;
							}
						}
					}
				} else {
					$p_type   = $field_schema['price_type'] ?? 'none';
					$p_amount = (float) ( $field_schema['price'] ?? 0 );

					$field_config          = array_merge( (array) $field_schema, array( '_opopw_price_context' => 'field' ) );
					$price_delta           = PricingEngine::calculate( $p_type, $base_price, $p_amount, $field_data['value'], $qty, $field_config );
					$total_price_addition += $price_delta;
				}
			}

			if ( abs( $total_price_addition ) > 0.0001 ) {
				// Floor at zero, matching updatePriceDisplay()'s
				// Math.max(0, basePrice + addonTotal) in assets/js/frontend.js.
				//
				// Discount options carry genuinely negative prices, so a large
				// enough discount on a cheap product would otherwise produce a
				// negative line item: the page would advertise 0.00 while the
				// cart charged below zero. The two sides must agree.
				$new_price = max( 0.0, $base_price + $total_price_addition );
				$cart_object->cart_contents[ $cart_item_key ]['data']->set_price( $new_price );

				if ( '' !== $raw_regular_price ) {
					$cart_object->cart_contents[ $cart_item_key ]['data']->set_regular_price( max( 0.0, $regular_price + $total_price_addition ) );
				}
				if ( '' !== $raw_sale_price ) {
					$cart_object->cart_contents[ $cart_item_key ]['data']->set_sale_price( max( 0.0, $sale_price + $total_price_addition ) );
				}
			}

			if ( abs( $total_weight_addition ) > 0.0001 ) {
				$base_weight = (float) $product->get_weight();
				$cart_object->cart_contents[ $cart_item_key ]['data']->set_weight( $base_weight + $total_weight_addition );
			}
		}

		$is_calculating = false;
	}

	/**
	 * Stage 4: Cart display
	 *
	 * Modifies the visible array structure injected into the frontend Cart and Checkout templates
	 * native to WooCommerce. Formats file links properly.
	 *
	 * Hook: woocommerce_get_item_data
	 *
	 * @since 1.0.0
	 * @param array $item_data Existing item data.
	 * @param array $cart_item The cart item payload.
	 * @return array Modified summary array.
	 */
	public function get_item_data( $item_data, $cart_item ) {
		if ( isset( $cart_item[ self::CART_KEY ] ) && ! empty( $cart_item[ self::CART_KEY ]['fields'] ) ) {
			foreach ( $cart_item[ self::CART_KEY ]['fields'] as $field ) {
				$display = $field['display_value'];

				$display = apply_filters( 'opopw_cart_display_field', $display, $field );

				$item_data[] = array(
					'name'    => $field['name'],
					'value'   => $display,
					'display' => '', // tells WC not to escape again if we returned HTML in 'value'
				);
			}
		}

		return $item_data;
	}

	/**
	 * Stage 5: Order meta storage
	 *
	 * @param \WC_Order_Item_Product $item           The order item object.
	 * @param string                 $cart_item_key  The cart item key.
	 * @param array                  $values         The cart item values.
	 * @param \WC_Order              $order          The order object.
	 */
	/**
	 * Add metadata to the order line item during checkout.
	 *
	 * @since 1.0.0
	 * @param \WC_Order_Item_Product $item           The order item.
	 * @param string                 $cart_item_key  The cart item key.
	 * @param array                  $values         The cart item values.
	 * @param \WC_Order              $order          The order object.
	 */
	public function add_order_item_meta( $item, $cart_item_key, $values, $order ) {
		if ( isset( $values[ self::CART_KEY ] ) && ! empty( $values[ self::CART_KEY ]['fields'] ) ) {
			opopw_log( sprintf( 'CartManager: Adding OptionBay - Product Options and Addons metadata to order line item: %s', $item->get_name() ), 'DEBUG' );
			$all_intents = array();
			foreach ( $values[ self::CART_KEY ]['fields'] as $field ) {

				$display = $field['display_value'];

				$display = apply_filters( 'opopw_order_display_field', $display, $field );

				$item->add_meta_data( $field['name'], $display );

				if ( ! empty( $field['reduction_intents'] ) ) {
					$all_intents = array_merge( $all_intents, $field['reduction_intents'] );
				}
			}

			if ( ! empty( $all_intents ) ) {
				$item->add_meta_data( '_opopw_stock_intents', $all_intents );

				// Open the ledger here, at ORDER CREATION, with nothing consumed.
				//
				// Intents are written for every order, but stock is only taken
				// later, on 'woocommerce_reduce_order_stock', which never fires
				// for an order that is not paid. Without this seed, cancelling
				// an unpaid order (or a failed payment dropping it back to
				// 'pending') would find intents but no ledger, fall into the
				// legacy reconstruction path, invent a 'consumed' figure from
				// the line quantity and release stock that was never taken —
				// inflating a shared pool and overselling it.
				//
				// A real reduction overwrites every 'consumed' below, so this
				// is only ever load-bearing for the never-reduced case.
				$seed = array(
					'authorised_refunded' => 0.0,
					'intents'             => array(),
				);
				foreach ( array_keys( $all_intents ) as $seed_index ) {
					$seed['intents'][ $seed_index ] = array(
						'consumed' => 0.0,
						'released' => 0.0,
					);
				}
				$item->add_meta_data( self::LEDGER_META, $seed );

				opopw_log( sprintf( 'CartManager: Added %d stock reduction intents to order line item.', count( $all_intents ) ), 'DEBUG' );
			}
		}
	}

	/**
	 * Reduce inventory stock when an order is placed, and open its ledger.
	 *
	 * Hook: woocommerce_reduce_order_stock
	 *
	 * @since 1.0.0
	 * @param \WC_Order $order The order object.
	 * @throws \Exception When stock is insufficient.
	 */
	public function reduce_inventory_stock( $order ) {
		opopw_log( sprintf( 'CartManager: Reducing inventory stock for Order #%d', $order->get_id() ), 'INFO' );

		foreach ( $order->get_items() as $item ) {
			$intents = $item->get_meta( '_opopw_stock_intents', true );

			if ( empty( $intents ) || ! is_array( $intents ) ) {
				continue;
			}

			$quantity = $item->get_quantity();

			// Carry forward what the ledger already records. This loop used to
			// start from scratch and decrement every intent unconditionally,
			// which leaks stock without bound: when one intent fails, the throw
			// below propagates out of wc_reduce_stock_levels() and core never
			// reaches set_stock_reduced( true ), so the whole reduction re-runs
			// on the next status change and takes the earlier intents a second
			// time while the ledger still records one. Core protects itself with
			// per-item '_reduced_stock' (wc-stock-functions.php:186-190); this is
			// the equivalent.
			//
			// Read the RAW meta, not get_item_ledger(): that helper seeds legacy
			// orders by reconstructing 'consumed' from the line quantity, which
			// here would make us skip decrements we must actually perform.
			$existing = $item->get_meta( self::LEDGER_META, true );
			$ledger   = array(
				// Deliberately resets: a fresh reduction cycle re-takes the whole
				// line, exactly as core does after wc_increase_stock_levels()
				// clears its own flag, so earlier refund accounting no longer
				// describes this cycle. Nothing reads it in between — the
				// cancel/pending path passes $remaining = 0.0.
				'authorised_refunded' => 0.0,
				'intents'             => ( is_array( $existing ) && isset( $existing['intents'] ) && is_array( $existing['intents'] ) )
					? $existing['intents']
					: array(),
			);

			foreach ( $intents as $index => $intent ) {
				$inv_id          = $intent['id'] ?? 0;
				$total_reduction = $this->calculate_total_intent_reduction( $intent, $quantity );

				// Skip anything still outstanding: taken and not yet given back.
				// Tested on outstanding rather than 'consumed > 0' so that
				// cancel -> reinstate -> cancel still works — after a cancel
				// 'released' equals 'consumed', so a reinstated order correctly
				// re-consumes. The seed written at order creation records
				// consumed = 0 and is therefore correctly treated as untaken.
				//
				// Known limitation, shared with core's own '_reduced_stock': a
				// line quantity edited between two reduction passes under-consumes,
				// because the skip is anchored on what was recorded earlier. Pro's
				// 'formula' reduction mode can also legitimately produce
				// consumed = 0, indistinguishable from never-consumed.
				$prior       = ( isset( $ledger['intents'][ $index ] ) && is_array( $ledger['intents'][ $index ] ) )
					? $ledger['intents'][ $index ]
					: array();
				$outstanding = (float) ( $prior['consumed'] ?? 0 ) - (float) ( $prior['released'] ?? 0 );

				if ( $outstanding > 0 ) {
					opopw_log( sprintf( 'CartManager: Inventory ID %d already holds %f for this item; not reducing again.', $inv_id, $outstanding ), 'INFO' );
					continue;
				}

				$success = \Opopw\Data\InventoryManager::get_instance()->decrement_stock( $inv_id, $total_reduction );

				if ( ! $success ) {
					// Persist the intents already decremented in this loop before
					// aborting. The ledger is otherwise only saved after the loop,
					// so a mid-loop failure would leave earlier intents taken from
					// the pool with no record of it — and a later cancel would then
					// reconstruct all of them from the line quantity and give back
					// stock the failed intent never took.
					$item->update_meta_data( self::LEDGER_META, $ledger );
					$item->save();

					opopw_log( sprintf( 'CartManager: ERROR: Insufficient stock for inventory ID %d. Cannot reduce by %f.', $inv_id, $total_reduction ), 'ERROR' );
					/* translators: %1$d: inventory ID */
					$message = sprintf( __( 'Insufficient stock for an option in your cart (Inventory #%1$d). Please adjust your order.', 'optionbay-product-options-addons-woo' ), $inv_id );

					// NB: the order is NOT halted, whatever this note used to claim.
					// WC_Order::status_transition() catches the exception below,
					// logs it and adds its own note (class-wc-order.php:500-513);
					// the gateway path catches it in payment_complete() and merely
					// returns false. What the throw DOES achieve is stopping core
					// from marking the order's stock as reduced, so the attempt is
					// retried on the next status change.
					/* translators: 1: inventory ID, 2: reduction amount */
					$order->add_order_note( sprintf( __( 'OptionBay - Product Options and Addons: Could not reduce add-on stock for inventory #%1$d (Amount: %2$s). Add-on stock for this order is incomplete.', 'optionbay-product-options-addons-woo' ), $inv_id, $total_reduction ) );

					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
					throw new \Exception( $message );
				}

				// Record what was actually taken. 'released' MUST reset to 0 here:
				// without it a cancel -> reinstate -> cancel cycle reproduces the old
				// leak, because the second reduction would be cancelled out by the
				// first cycle's release total.
				$ledger['intents'][ $index ] = array(
					'consumed' => (float) $total_reduction,
					'released' => 0.0,
				);

				opopw_log( sprintf( 'CartManager: SUCCESS: Decremented inventory ID %d by amount %f', $inv_id, $total_reduction ), 'INFO' );
			}

			// No item-level LEGACY_RESTORED_META to delete: that flag was only
			// ever written and read on the ORDER (see the delete below).
			$item->update_meta_data( self::LEDGER_META, $ledger );
			$item->save();
		}

		// A fresh reduction cycle invalidates any legacy "already restored" marker.
		$order->delete_meta_data( self::LEGACY_RESTORED_META );
		$order->save();
	}

	/**
	 * Release all remaining add-on stock for an order.
	 *
	 * Hooks: woocommerce_order_status_cancelled, woocommerce_order_status_pending
	 *
	 * Cancellation is not a refund, so `remaining` is 0 for the whole line —
	 * deriving it from get_qty_refunded_for_item() here would yield the full
	 * quantity and release nothing at all.
	 *
	 * @since 1.0.0
	 * @param int $order_id The order ID.
	 */
	public function restore_order_stock( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		opopw_log( sprintf( 'CartManager: Releasing all inventory for Order #%d', $order->get_id() ), 'INFO' );

		foreach ( $order->get_items() as $item ) {
			$this->reconcile_item_stock( $item, $order, 0.0 );
		}
	}

	/**
	 * Release add-on stock for refunded units.
	 *
	 * Hook: woocommerce_can_restock_refunded_items (filter, passed through
	 * unchanged). WooCommerce only calls this when the admin ticked "Restock
	 * refunded items" (wc-order-functions.php:680), and unlike the per-item
	 * action it fires before the loop that skips non-stock-managed products.
	 *
	 * @since 1.0.3
	 * @param bool      $can_restock         Whether core will restock.
	 * @param \WC_Order $order               The order being refunded.
	 * @param array     $refunded_line_items Per-item refund detail, keyed by item ID.
	 * @return bool The unmodified $can_restock value.
	 */
	public function restore_refunded_stock( $can_restock, $order, $refunded_line_items ) {
		if ( ! $can_restock || ! $order || ! is_array( $refunded_line_items ) ) {
			return $can_restock;
		}

		foreach ( $order->get_items() as $item_id => $item ) {
			$qty_refunded_now = (float) abs( $refunded_line_items[ $item_id ]['qty'] ?? 0 );
			if ( $qty_refunded_now <= 0 ) {
				continue;
			}

			$ledger = $this->get_item_ledger( $item, $order );

			// Accumulate only refunds where restock was approved. Using
			// get_qty_refunded_for_item() instead would also count earlier refunds
			// made with the box unticked, releasing units never authorised.
			$ledger['authorised_refunded'] += $qty_refunded_now;

			$remaining = max( 0.0, (float) $item->get_quantity() - $ledger['authorised_refunded'] );

			$this->reconcile_item_stock( $item, $order, $remaining, $ledger );
		}

		return $can_restock;
	}

	/**
	 * Read an order item's stock ledger, seeding it for pre-1.0.3 orders.
	 *
	 * There is no migration mechanism in this plugin, so legacy orders must be
	 * handled inline and forever. Two legacy states exist and BOTH matter:
	 * already-restored (seed released = consumed, so nothing is given back
	 * twice) and never-restored (seed released = 0, otherwise every order in
	 * flight at upgrade would leak its add-on stock permanently).
	 *
	 * @since 1.0.3
	 * @param \WC_Order_Item $item  The order line item.
	 * @param \WC_Order|null $order The parent order, for the legacy flag.
	 * @return array The ledger.
	 */
	private function get_item_ledger( $item, $order = null ) {
		$ledger = $item->get_meta( self::LEDGER_META, true );

		if ( is_array( $ledger ) && isset( $ledger['intents'] ) ) {
			$ledger['authorised_refunded'] = (float) ( $ledger['authorised_refunded'] ?? 0.0 );
			return $ledger;
		}

		$intents = $item->get_meta( '_opopw_stock_intents', true );
		$ledger  = array(
			'authorised_refunded' => 0.0,
			'intents'             => array(),
		);

		if ( empty( $intents ) || ! is_array( $intents ) ) {
			return $ledger;
		}

		$already_restored = $order && '1' === (string) $order->get_meta( self::LEGACY_RESTORED_META, true );

		// Was this order's stock ever actually taken? Reconstructing 'consumed'
		// from the line quantity is only defensible for an order that really did
		// reduce stock. An unpaid legacy order never fired
		// 'woocommerce_reduce_order_stock' at all, so releasing against it would
		// credit a shared pool with units nobody ever took and let it oversell —
		// and unpaid orders are cancelled routinely by wc_cancel_unpaid_orders()
		// on the "Hold stock (minutes)" schedule.
		//
		// This is why restore_order_stock runs at priority 9: core clears the
		// flag at priority 10 on the very same hooks.
		//
		// Two honest caveats. First, this applies to the REFUND path too, since
		// restore_refunded_stock() also passes a non-null $order. That is correct
		// there — a refundable order has had its stock reduced — but the guard is
		// not cancel-only. Second, it is a proxy rather than proof: with
		// store-wide "Manage stock" off, wc_maybe_reduce_stock_levels sets the
		// flag true even though wc_reduce_stock_levels early-returned and our
		// hook never ran, so on such a store a legacy cancel can still
		// phantom-release.
		$stock_was_reduced = true;
		if ( $order && method_exists( $order, 'get_data_store' ) ) {
			$stock_was_reduced = (bool) $order->get_data_store()->get_stock_reduced( $order->get_id() );
		}

		foreach ( $intents as $index => $intent ) {
			// Legacy orders have no recorded `consumed`, so it is reconstructed
			// from the line quantity. That is only safe as a fallback — new orders
			// always carry the real figure written at reduction time.
			$consumed                    = $stock_was_reduced
				? (float) $this->calculate_total_intent_reduction( $intent, $item->get_quantity() )
				: 0.0;
			$ledger['intents'][ $index ] = array(
				'consumed' => $consumed,
				'released' => $already_restored ? $consumed : 0.0,
			);
		}

		opopw_log( sprintf( 'CartManager: Seeded legacy stock ledger for item %d (already restored: %s).', $item->get_id(), $already_restored ? 'yes' : 'no' ), 'DEBUG' );

		return $ledger;
	}

	/**
	 * Release the difference between what an item consumed and what it should
	 * still be consuming at the given remaining quantity.
	 *
	 * Idempotent: re-running with the same `$remaining` releases nothing more.
	 *
	 * @since 1.0.3
	 * @param \WC_Order_Item $item      The order line item.
	 * @param \WC_Order      $order     The parent order.
	 * @param float          $remaining Units of this line still standing.
	 * @param array|null     $ledger    Pre-loaded ledger, if the caller has one.
	 */
	private function reconcile_item_stock( $item, $order, $remaining, $ledger = null ) {
		$intents = $item->get_meta( '_opopw_stock_intents', true );
		if ( empty( $intents ) || ! is_array( $intents ) ) {
			return;
		}

		if ( null === $ledger ) {
			$ledger = $this->get_item_ledger( $item, $order );
		}

		$inv_manager = \Opopw\Data\InventoryManager::get_instance();

		foreach ( $intents as $index => $intent ) {
			$entry    = $ledger['intents'][ $index ] ?? array(
				'consumed' => 0.0,
				'released' => 0.0,
			);
			$consumed = (float) $entry['consumed'];
			$released = (float) $entry['released'];

			$should = $remaining > 0
				? (float) $this->calculate_total_intent_reduction( $intent, $remaining )
				: 0.0;

			$release = max( 0.0, $consumed - $should - $released );

			if ( $release <= 0 ) {
				$ledger['intents'][ $index ] = $entry;
				continue;
			}

			$inv_id  = $intent['id'] ?? 0;
			$success = $inv_manager->increment_stock( $inv_id, $release );

			if ( $success ) {
				$entry['released'] = $released + $release;
				opopw_log( sprintf( 'CartManager: Released %f of inventory ID %d (consumed %f, should %f).', $release, $inv_id, $consumed, $should ), 'INFO' );
			} else {
				opopw_log( sprintf( 'CartManager: ERROR: Failed to release %f of inventory ID %d.', $release, $inv_id ), 'ERROR' );
			}

			$ledger['intents'][ $index ] = $entry;
		}

		// Only the ITEM is dirty; $item->save() persists the ledger on its own.
		// There is deliberately no $order->save() here — nothing on the order was
		// modified, and saving it fires 'woocommerce_update_order' (the
		// order.updated webhook, the HPOS DataSynchronizer, WC-Admin's
		// OrdersScheduler) from inside wc_create_refund()'s try block, AFTER the
		// gateway has already refunded. A third-party exception there would be
		// caught and returned as WP_Error, showing the admin "refund failed" for
		// a refund that actually succeeded at the gateway.
		$item->update_meta_data( self::LEDGER_META, $ledger );
		$item->save();
	}

	/**
	 * Helper: Calculate total reduction for a stored intent.
	 *
	 * Delegates to the shared helper so CartManager and InventoryManager can
	 * never disagree about what an intent consumes.
	 *
	 * @since 1.0.0
	 * @param array $intent   The intent data.
	 * @param int   $quantity The quantity.
	 * @return float
	 */
	private function calculate_total_intent_reduction( $intent, $quantity ) {
		return opopw_calculate_intent_reduction( $intent, $quantity );
	}

	/**
	 * Helper: Check stock availability.
	 *
	 * @param int   $inventory_id     The inventory ID.
	 * @param float $requested_amount The requested amount.
	 * @return bool
	 */
	private function check_stock_availability( $inventory_id, $requested_amount ) {
		$inv = \Opopw\Data\InventoryManager::get_instance()->get_item( $inventory_id );
		if ( ! $inv ) {
			return true;
		}

		$allow_backorders = (bool) $inv['allow_backorders'];
		$stock_count      = floatval( $inv['stock_count'] );

		if ( $allow_backorders ) {
			return true;
		}

		$reserved  = \Opopw\Data\InventoryManager::get_instance()->get_cart_reserved_stock( $inventory_id );
		$available = $stock_count - $reserved;

		return $available >= floatval( $requested_amount );
	}

	/**
	 * Helper: Get stock already reserved in cart.
	 *
	 * @deprecated Use \Opopw\Data\InventoryManager::get_cart_reserved_stock instead.
	 * @param int    $inventory_id          The inventory ID.
	 * @param string $exclude_cart_item_key The cart item key to exclude.
	 * @return float
	 */
	private function get_cart_reserved_stock( $inventory_id, $exclude_cart_item_key = null ) {
		return \Opopw\Data\InventoryManager::get_instance()->get_cart_reserved_stock( $inventory_id, $exclude_cart_item_key );
	}

	/**
	 * Helper: Collect intents from a request.
	 *
	 * @param int   $product_id     The product ID.
	 * @param int   $quantity       The quantity.
	 * @param array $submitted_data The submitted data.
	 * @return array
	 */
	private function collect_intents_from_request( $product_id, $quantity, $submitted_data ) {
		$intents   = array();
		$group_ids = $this->get_groups_for_product( $product_id );

		foreach ( $group_ids as $group_id ) {
			$schema     = $this->get_group_schema( $group_id );
			$group_data = $submitted_data[ $group_id ] ?? array();

			foreach ( $schema as $field_schema ) {
				if ( ! ConditionEvaluator::is_visible( $field_schema, $group_data, $schema ) ) {
					continue;
				}

				// Presentational fields never carry a value or stock.
				if ( in_array( $field_schema['type'] ?? '', opopw_get_presentational_field_types(), true ) ) {
					continue;
				}

				$field_id = $field_schema['id'];
				$value    = $group_data[ $field_id ] ?? null;
				$value    = apply_filters( 'opopw_cart_process_field_value', $value, $field_schema, $group_id );

				// Mirror add_cart_item_data(): an empty field is not stored, so it must not reserve stock.
				if ( null === $value || '' === $value ) {
					continue;
				}

				if ( ! empty( $field_schema['enable_stock'] ) && ! empty( $field_schema['inventory_id'] ) ) {
					$inv_id = $field_schema['inventory_id'];
					$intent = array(
						'id'     => $inv_id,
						'mode'   => $field_schema['reduction_mode'] ?? 'per_item_qty',
						'value'  => $value,
						'amount' => 1.0,
					);
					$intent = apply_filters( 'opopw_stock_reduction_intent', $intent, $field_schema, $value );

					$amount             = $this->calculate_total_intent_reduction( $intent, $quantity );
					$intents[ $inv_id ] = ( $intents[ $inv_id ] ?? 0 ) + $amount;
				}

				if ( in_array( $field_schema['type'], array( 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch' ), true ) ) {
					$values_array = is_array( $value ) ? $value : array( $value );
					foreach ( $field_schema['options'] ?? array() as $opt ) {
						if ( in_array( $opt['value'], $values_array, true ) && ! empty( $opt['enable_stock'] ) && ! empty( $opt['inventory_id'] ) ) {
							$inv_id = $opt['inventory_id'];
							$intent = array(
								'id'     => $inv_id,
								'mode'   => $opt['reduction_mode'] ?? 'per_item_qty',
								'value'  => $opt['value'],
								'amount' => 1.0,
							);
							$intent = apply_filters( 'opopw_stock_reduction_intent', $intent, $opt, $opt['value'] );

							$amount             = $this->calculate_total_intent_reduction( $intent, $quantity );
							$intents[ $inv_id ] = ( $intents[ $inv_id ] ?? 0 ) + $amount;
						}
					}
				}
			}
		}

		return $intents;
	}

	/**
	 * Recover data from session (needed for cart edits or session rebuild)
	 *
	 * @param array $cart_item The cart item data.
	 * @return array
	 */
	public function load_cart_item_data( $cart_item ) {
		if ( isset( $cart_item[ self::CART_KEY ] ) ) {
			return $cart_item;
		}
		return $cart_item;
	}
}
