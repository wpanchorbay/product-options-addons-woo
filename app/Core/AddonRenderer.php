<?php
/**
 * Addon Renderer — handles displaying option fields on the product page.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */

namespace SmartProductOptionsAddons\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use SmartProductOptionsAddons\Data\DbManager;
use SmartProductOptionsAddons\Fields\FieldFactory;
use SmartProductOptionsAddons\Helper\WooCommerce;

/**
 * Rendering Engine — hooks into WooCommerce product pages to display
 * option groups based on assignment rules.
 *
 * Pipeline:
 *   1. Assignment Resolution: query lookup table for matching groups
 *   2. Schema Retrieval: load JSON schemas from post meta
 *   3. HTML Generation: pass each field through FieldFactory
 *   4. State Hydration: print spoaSchema + spoaBasePrice to JS
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */
class AddonRenderer extends Base {

	/**
	 * Register the hooks for this component.
	 *
	 * @since 1.0.0
	 * @param Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();

		// Render fields on product page
		$loader->add_action(
			'woocommerce_before_add_to_cart_button',
			$this,
			'render_product_options',
			10
		);

		// Enqueue frontend assets conditionally
		$loader->add_action(
			'wp_enqueue_scripts',
			$this,
			'maybe_enqueue_assets'
		);
	}

	/**
	 * Render option groups on the product page.
	 *
	 * This function hooks into the WooCommerce product page to fetch and display the assigned option groups and fields.
	 *
	 * Hooked to: woocommerce_before_add_to_cart_button
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function render_product_options() {
		global $product;

		// Skip if there's no valid WooCommerce product context
		if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
			return;
		}

		$product_id = $product->get_id();
		opopw_log( "Rendering options for Product ID: {$product_id}", 'DEBUG' );

		$group_ids = $this->get_groups_for_product( $product_id );

		// Stop rendering if no groups are assigned
		if ( empty( $group_ids ) ) {
			opopw_log( "No option groups assigned to Product ID: {$product_id}", 'DEBUG' );
			return;
		}

		$schemas     = array();
		$html_output = '';

		// Loop through all assigned option groups to generate their HTML
		foreach ( $group_ids as $group_id ) {
			$schema = $this->get_group_schema( $group_id );
			if ( empty( $schema ) ) {
				continue;
			}

			$group_title = get_the_title( $group_id );

			// Store the schema in an array for JavaScript hydration later
			$schemas[ $group_id ] = array(
				'title'  => $group_title,
				'fields' => $schema,
			);

			// Generate the HTML for the group's fields
			$html_output .= $this->render_group( $group_id, $schema );
		}

		if ( empty( $html_output ) ) {
			return;
		}

		opopw_log( "Successfully built option fields HTML for Product ID: {$product_id}", 'INFO' );

		// Retrieve global UI settings
		$settings            = Settings::get_instance();
		$orientation         = $settings->get_settings( 'global_optionsOrientation' );
		$font_label          = $settings->get_settings( 'global_fontSizeLabel' );
		$font_input          = $settings->get_settings( 'global_fontSizeInput' );
		$swatch_size         = $settings->get_settings( 'global_swatchSize' );
		$swatch_image_size   = $settings->get_settings( 'global_swatchImageSize' );
		$swatch_radius       = $settings->get_settings( 'global_swatchRadius' );
		$swatch_image_radius = $settings->get_settings( 'global_swatchImageRadius' );

		// Build inline styles for font and swatch customization
		$style_attr = sprintf(
			'--ob-font-size-label: %s; --ob-font-size-input: %s; --ob-swatch-size: %s; --ob-swatch-image-size: %s; --ob-swatch-radius: %s; --ob-swatch-image-radius: %s;',
			esc_attr( $font_label ),
			esc_attr( $font_input ),
			esc_attr( $swatch_size ),
			esc_attr( $swatch_image_size ),
			esc_attr( $swatch_radius ),
			esc_attr( $swatch_image_radius )
		);

		// Output the fully rendered fields wrapper
		printf(
			'<div class="ob-options-wrapper" id="wpab-wpoa-options" data-orientation="%s" style="%s">',
			esc_attr( $orientation ),
			esc_attr( $style_attr )
		);
		echo $html_output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML is escaped in render_group/field render methods
		echo '</div>';

		// The schema hydration is now handled in maybe_enqueue_assets to ensure correct timing
	}

	/**
	 * Render a single group's fields.
	 *
	 * Maps through the JSON schema configuration for a particular Option Group
	 * and uses the FieldFactory to generate the matching HTML for each field.
	 *
	 * @since 1.0.0
	 * @param int   $group_id  The group post ID.
	 * @param array $schema    Field definitions array.
	 * @return string HTML output.
	 */
	private function render_group( int $group_id, array $schema ) {
		$layout = 'flat';

		$html = sprintf(
			'<div class="ob-group ob-group--%s" data-group-id="%d">',
			esc_attr( $layout ),
			$group_id
		);

		// Group title is for admin reference only - not shown on frontend

		// Iterate over every field inside the group's schema
		foreach ( $schema as $field_schema ) {
			// Leverage factory pattern to instantiate the right HTML generator
			$field = FieldFactory::create( $group_id, $field_schema );
			if ( $field ) {
				$field_html = $field->render();
				$html      .= apply_filters( 'opopw_render_field_html', $field_html, $field_schema, $group_id );
			} else {
				$type = $field_schema['type'] ?? 'unknown';
				opopw_log( "Warning: Unrecognized field type '{$type}' in group {$group_id}", 'ERROR' );
			}
		}

		// Setup the live pricing display container at the bottom of the group
		$html .= '<div class="wpab-wpoa-live-total" style="display:none;">';
		$html .= sprintf(
			'<span class="ob-total-label">%s</span> ',
			esc_html__( 'Total Product Price:', 'optionbay-product-options-addons-woo' )
		);
		$html .= '<span class="amount"></span>';
		$html .= '</div>';

		$html .= '</div>';

		return $html;
	}

	/**
	 * Hydrate the page with JSON schema data for the JS engine.
	 *
	 * Prints window.spoaSchema and window.spoaBasePrice.
	 *
	 * @since 1.0.0
	 * @param array       $schemas  Grouped schemas indexed by group ID.
	 * @param \WC_Product $product  The current product.
	 * @return void
	 */
	private function hydrate_schema( array $schemas, $product ) {
		$base_price   = floatval( $product->get_price() );
		$currency     = WooCommerce::get_currency_symbol();
		$decimals     = WooCommerce::get_price_decimals();
		$thousand_sep = WooCommerce::get_price_thousand_separator();
		$decimal_sep  = WooCommerce::get_price_decimal_separator();
		$price_format = WooCommerce::get_price_format();

		// Collect all inventory IDs used in the schemas
		$inventory_ids = array();
		foreach ( $schemas as $group ) {
			if ( empty( $group['fields'] ) ) {
				continue;
			}
			foreach ( $group['fields'] as $field ) {
				if ( ! empty( $field['inventory_id'] ) ) {
					$inventory_ids[] = (int) $field['inventory_id'];
				}
				if ( ! empty( $field['options'] ) && is_array( $field['options'] ) ) {
					foreach ( $field['options'] as $opt ) {
						if ( ! empty( $opt['inventory_id'] ) ) {
							$inventory_ids[] = (int) $opt['inventory_id'];
						}
					}
				}
			}
		}
		$inventory_ids = array_unique( $inventory_ids );

		$inventory_data = array();
		if ( ! empty( $inventory_ids ) ) {
			$inv_manager = \SmartProductOptionsAddons\Data\InventoryManager::get_instance();
			foreach ( $inventory_ids as $inv_id ) {
				$inv = $inv_manager->get_item( $inv_id );
				if ( $inv ) {
					$inventory_data[ $inv_id ] = array(
						'stock'            => floatval( $inv['stock_count'] ),
						'allow_backorders' => (bool) $inv['allow_backorders'],
						'reserved'         => $inv_manager->get_cart_reserved_stock( $inv_id ),
					);
				}
			}
		}

		$hydration_data = array(
			'schemas'     => $schemas,
			'basePrice'   => $base_price,
			'currency'    => $currency,
			'decimals'    => $decimals,
			'thousandSep' => $thousand_sep,
			'decimalSep'  => $decimal_sep,
			'priceFormat' => $price_format,
			'inventory'   => $inventory_data,
			'i18n'        => array(
				'outOfStock' => __( 'Out of stock', 'optionbay-product-options-addons-woo' ),
			),
		);

		// Hydrate JS state using the standard WordPress inline script method
		wp_add_inline_script(
			'wpab-wpoa-frontend',
			'window.spoaSchema = ' . wp_json_encode( $hydration_data ) . ';',
			'before'
		);
	}

	/**
	 * Get group IDs assigned to a product (with caching).
	 *
	 * Determines which option groups globally or specifically apply to this product
	 * checking categories, tags, and product-specific assignments.
	 *
	 * @since 1.0.0
	 * @param int $product_id The product ID to query for.
	 * @return array Group IDs.
	 */
	private function get_groups_for_product( int $product_id ) {
		$cache_key = 'ob_assignments_product_' . $product_id;
		$cached    = wp_cache_get( $cache_key, 'optionbay-product-options-addons-woo' );

		if ( false !== $cached ) {
			return $cached;
		}

		// Retrieve all term associations for the product to match global category/tag rules
		$category_ids = WooCommerce::get_product_cat_ids( $product_id );
		$tag_ids      = WooCommerce::get_product_tag_ids( $product_id );

		// Ask DbManager to resolve assignments
		$group_ids = DbManager::get_instance()->get_groups_for_product(
			$product_id,
			$category_ids,
			$tag_ids
		);

		wp_cache_set( $cache_key, $group_ids, 'optionbay-product-options-addons-woo', 300 ); // 5 min TTL

		return $group_ids;
	}

	/**
	 * Get a group's schema from post meta (with caching).
	 *
	 * @since 1.0.0
	 * @param int $group_id The group ID.
	 * @return array
	 */
	private function get_group_schema( int $group_id ) {
		$cache_key = 'ob_schema_group_' . $group_id;
		$cached    = wp_cache_get( $cache_key, 'optionbay-product-options-addons-woo' );

		if ( false !== $cached ) {
			return $cached;
		}

		$raw    = get_post_meta( $group_id, AddonGroup::META_SCHEMA, true );
		$schema = json_decode( $raw, true );

		if ( ! is_array( $schema ) ) {
			$schema = array();
		}

		wp_cache_set( $cache_key, $schema, 'optionbay-product-options-addons-woo', 600 ); // 10 min TTL

		return $schema;
	}

	/**
	 * Remove get_group_settings, as we are managing it globally.
	 */

	/**
	 * Conditionally enqueue frontend assets on product pages.
	 *
	 * Only loads if the current product has active option groups.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function maybe_enqueue_assets() {
		if ( ! WooCommerce::is_product() ) {
			return;
		}

		global $post;
		if ( ! $post ) {
			return;
		}

		$product = wc_get_product( $post->ID );
		// Determine which groups are assigned to this product
		$group_ids = $this->get_groups_for_product( $product->get_id() );
		$group_ids = apply_filters( 'opopw_product_group_ids', $group_ids, $product->get_id() );

		if ( empty( $group_ids ) ) {
			return;
		}

		// Frontend CSS
		wp_enqueue_style(
			'wpab-wpoa-frontend',
			OPOPW_URL . 'assets/css/frontend.css',
			array(),
			OPOPW_VERSION
		);

		// Frontend JS
		wp_enqueue_script(
			'wpab-wpoa-frontend',
			OPOPW_URL . 'assets/js/frontend.js',
			array( 'jquery' ),
			OPOPW_VERSION,
			true
		);

		// Hydrate JS state
		$product = wc_get_product( $post->ID );
		$schemas = array();
		foreach ( $group_ids as $group_id ) {
			$schema = $this->get_group_schema( $group_id );
			if ( empty( $schema ) ) {
				continue;
			}
			$schemas[ $group_id ] = array(
				'title'  => get_the_title( $group_id ),
				'fields' => $schema,
			);
		}

		$this->hydrate_schema( $schemas, $product );
	}
}
