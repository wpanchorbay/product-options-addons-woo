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
		$loader->add_action( 'woocommerce_order_status_cancelled', $this, 'restore_order_stock', 10, 1 );

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
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$files_data = isset( $_FILES['opopw_addons'] ) ? (array) $_FILES['opopw_addons'] : array();

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
				if ( ! ConditionEvaluator::is_visible( $field_schema, $group_data ) ) {
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
	 * Stores the verified user choices into the WooCommerce cart session securely. It handles
	 * formatting, sanitization, and WordPress native file uploads before committing to session.
	 *
	 * Hook: woocommerce_add_cart_item_data
	 *
	 * @since 1.0.0
	 * @param array $cart_item_data The cart item data structure.
	 * @param int   $product_id     The product ID.
	 * @param int   $variation_id   The variation ID.
	 * @return array Modified cart item data.
	 * @throws \Exception If a file upload passes validation but fails native WP processing.
	 */
	public function add_cart_item_data( $cart_item_data, $product_id, $variation_id ) {
		$group_ids = $this->get_groups_for_product( $product_id );
		if ( empty( $group_ids ) ) {
			return $cart_item_data;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended, WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$submitted_data = isset( $_REQUEST['opopw_addons'] ) ? wp_unslash( (array) $_REQUEST['opopw_addons'] ) : array();
		$files_data     = isset( $_FILES['opopw_addons'] ) ? (array) $_FILES['opopw_addons'] : array();
		// phpcs:enable

		$session_data          = array();
		$total_price_addition  = 0.0;
		$total_weight_addition = 0.0;

		foreach ( $group_ids as $group_id ) {
			$schema     = $this->get_group_schema( $group_id );
			$group_data = $submitted_data[ $group_id ] ?? array();

			foreach ( $schema as $field_schema ) {
				$field_id = $field_schema['id'] ?? 'unknown_id';

				if ( ! ConditionEvaluator::is_visible( $field_schema, $group_data ) ) {
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
						foreach ( $field_schema['options'] as $opt ) {
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

		if ( wp_doing_ajax() && ! did_action( 'woocommerce_calculate_totals' ) ) {
			$_add_to_cart = apply_filters( 'opopw_ajax_calculate_totals', true );
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

					foreach ( $values as $val ) {
						foreach ( $options as $opt ) {
							if ( $opt['value'] === $val ) {
								$p_type   = $opt['price_type'] ?? 'flat';
								$p_amount = (float) ( $opt['price'] ?? 0 );

								$price_delta           = PricingEngine::calculate( $p_type, $base_price, $p_amount, $val, $qty, (array) $opt );
								$total_price_addition += $price_delta;
							}
						}
					}
				} else {
					$p_type   = $field_schema['price_type'] ?? 'none';
					$p_amount = (float) ( $field_schema['price'] ?? 0 );

					$price_delta           = PricingEngine::calculate( $p_type, $base_price, $p_amount, $field_data['value'], $qty, (array) $field_schema );
					$total_price_addition += $price_delta;
				}
			}

			if ( abs( $total_price_addition ) > 0.0001 ) {
				$new_price = $base_price + $total_price_addition;
				$cart_object->cart_contents[ $cart_item_key ]['data']->set_price( $new_price );

				if ( '' !== $raw_regular_price ) {
					$cart_object->cart_contents[ $cart_item_key ]['data']->set_regular_price( $regular_price + $total_price_addition );
				}
				if ( '' !== $raw_sale_price ) {
					$cart_object->cart_contents[ $cart_item_key ]['data']->set_sale_price( $sale_price + $total_price_addition );
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
				opopw_log( sprintf( 'CartManager: Added %d stock reduction intents to order line item.', count( $all_intents ) ), 'DEBUG' );
			}
		}
	}

	/**
	 * Reduce inventory stock when order is placed.
	 *
	 * @since 1.0.0
	 * @param \WC_Order $order The order object.
	 * @throws \Exception When stock is insufficient.
	 */
	public function reduce_inventory_stock( $order ) {
		opopw_log( sprintf( 'CartManager: Reducing inventory stock for Order #%d', $order->get_id() ), 'INFO' );
		foreach ( $order->get_items() as $item ) {
			$intents = $item->get_meta( '_opopw_stock_intents', true );

			if ( empty( $intents ) ) {
				continue;
			}

			if ( ! is_array( $intents ) ) {
				opopw_log( sprintf( 'CartManager: Intents is not an array for item %s.', $item->get_name() ), 'WARNING' );
				continue;
			}

			$quantity = $item->get_quantity();
			opopw_log( sprintf( 'CartManager: Checking Item "%s" with quantity %f', $item->get_name(), $quantity ), 'DEBUG' );

			foreach ( $intents as $intent ) {
				$inv_id          = $intent['id'] ?? 0;
				$total_reduction = $this->calculate_total_intent_reduction( $intent, $quantity );
				opopw_log( sprintf( 'CartManager: Dec stock intent for inventory ID %d by amount %f', $inv_id, $total_reduction ), 'DEBUG' );

				$success = \Opopw\Data\InventoryManager::get_instance()->decrement_stock( $inv_id, $total_reduction );

				if ( ! $success ) {
					opopw_log( sprintf( 'CartManager: ERROR: Insufficient stock for inventory ID %d. Cannot reduce by %f.', $inv_id, $total_reduction ), 'ERROR' );
					/* translators: %1$d: inventory ID */
					$message = sprintf( __( 'Insufficient stock for an option in your cart (Inventory #%1$d). Please adjust your order.', 'optionbay-product-options-addons-woo' ), $inv_id );

					/* translators: 1: inventory ID, 2: reduction amount */
					$order->add_order_note( sprintf( __( 'OptionBay - Product Options and Addons: Failed to reduce stock for inventory #%1$d (Amount: %2$s). Order halted.', 'optionbay-product-options-addons-woo' ), $inv_id, $total_reduction ) );

					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
					throw new \Exception( $message );
				}
				opopw_log( sprintf( 'CartManager: SUCCESS: Decremented inventory ID %d by amount %f', $inv_id, $total_reduction ), 'INFO' );
			}
		}
	}

	/**
	 * Restore stock when order is cancelled or refunded.
	 *
	 * @since 1.0.0
	 * @param int $order_id The order ID.
	 */
	public function restore_order_stock( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		if ( '1' === $order->get_meta( '_opopw_stock_restored', true ) ) {
			return;
		}

		opopw_log( sprintf( 'CartManager: Restoring inventory stock for Order #%d', $order->get_id() ), 'INFO' );

		foreach ( $order->get_items() as $item ) {
			$intents = $item->get_meta( '_opopw_stock_intents', true );
			if ( empty( $intents ) || ! is_array( $intents ) ) {
				continue;
			}

			$quantity = $item->get_quantity();
			opopw_log( sprintf( 'CartManager: Restoring stock for Item "%s" with quantity %f', $item->get_name(), $quantity ), 'DEBUG' );

			foreach ( $intents as $intent ) {
				$total_restoration = $this->calculate_total_intent_reduction( $intent, $quantity );
				opopw_log( sprintf( 'CartManager: Restoring inventory ID %d by amount %f', $intent['id'], $total_restoration ), 'DEBUG' );

				$success = \Opopw\Data\InventoryManager::get_instance()->increment_stock( $intent['id'], $total_restoration );
				if ( $success ) {
					opopw_log( sprintf( 'CartManager: SUCCESS: Incremented inventory ID %d by amount %f', $intent['id'], $total_restoration ), 'INFO' );
				} else {
					opopw_log( sprintf( 'CartManager: ERROR: Failed to increment inventory ID %d by amount %f', $intent['id'], $total_restoration ), 'ERROR' );
				}
			}
		}

		$order->update_meta_data( '_opopw_stock_restored', '1' );
		$order->save();
	}

	/**
	 * Helper: Calculate reduction amount.
	 *
	 * @param int    $qty     The quantity.
	 * @param string $mode    The reduction mode.
	 * @param array  $intent  The stock intent structure.
	 * @return float
	 */
	private function calculate_reduction_amount( $qty, $mode, $intent = null ) {
		$custom_amount = apply_filters( 'opopw_calculate_reduction', null, $qty, $mode, $intent );
		if ( null !== $custom_amount ) {
			return $custom_amount;
		}

		if ( 'per_line_item' === $mode ) {
			return 1.0;
		}
		if ( 'per_item_qty' === $mode ) {
			return floatval( $qty );
		}
		return floatval( $qty );
	}

	/**
	 * Helper: Calculate total reduction for a stored intent.
	 *
	 * @param array $intent   The intent data.
	 * @param int   $quantity The quantity.
	 * @return float
	 */
	private function calculate_total_intent_reduction( $intent, $quantity ) {
		$mode = $intent['mode'] ?? 'per_item_qty';

		return $this->calculate_reduction_amount( $quantity, $mode, $intent );
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
				if ( ! ConditionEvaluator::is_visible( $field_schema, $group_data ) ) {
					continue;
				}

				$field_id = $field_schema['id'];
				$value    = $group_data[ $field_id ] ?? null;

				if ( ! empty( $field_schema['enable_stock'] ) && ! empty( $field_schema['inventory_id'] ) ) {
					$inv_id             = $field_schema['inventory_id'];
					$amount             = $this->calculate_reduction_amount( $quantity, $field_schema['reduction_mode'] ?? 'per_item_qty' );
					$intents[ $inv_id ] = ( $intents[ $inv_id ] ?? 0 ) + $amount;
				}

				if ( in_array( $field_schema['type'], array( 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch' ), true ) ) {
					$values_array = is_array( $value ) ? $value : array( $value );
					foreach ( $field_schema['options'] as $opt ) {
						if ( in_array( $opt['value'], $values_array, true ) && ! empty( $opt['enable_stock'] ) && ! empty( $opt['inventory_id'] ) ) {
							$inv_id             = $opt['inventory_id'];
							$amount             = $this->calculate_reduction_amount( $quantity, $opt['reduction_mode'] ?? 'per_item_qty' );
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
