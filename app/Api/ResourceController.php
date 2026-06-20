<?php
/**
 * Resource Controller — REST API handling for WooCommerce resources.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Api
 */

namespace SmartProductOptionsAddons\Api;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * REST API controller for accessing WooCommerce resources.
 *
 * Provides endpoints to search products, categories, and tags
 * for the admin Assignment Rules UI.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Api
 */
class ResourceController extends ApiController {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var ResourceController
	 */
	private static $instance = null;

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected $rest_base = 'resources';

	/**
	 * Resource type.
	 *
	 * @var string
	 */
	protected $type = '';

	/**
	 * Initialize the controller and register routes.
	 *
	 * @since 1.0.0
	 */
	public function run() {
		$this->type = 'opopw_api_resources';

		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST API routes for resources.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		$namespace = $this->namespace . '/' . $this->version;

		// Products endpoint
		register_rest_route(
			$namespace,
			'/' . $this->rest_base . '/products',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_products' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
				),
			)
		);

		// Categories endpoint
		register_rest_route(
			$namespace,
			'/' . $this->rest_base . '/categories',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_categories' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
				),
			)
		);

		// Tags endpoint
		register_rest_route(
			$namespace,
			'/' . $this->rest_base . '/tags',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_tags' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
				),
			)
		);
	}

	/**
	 * Get products (simple + variable), searchable by name, ID, or SKU.
	 *
	 * Returns products in a format compatible with ClassicMultiSelect,
	 * including thumbnail URL and SKU for custom rendering.
	 * Variable products include their variants as nested items.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public function get_products( $request ) {
		$search = $request->get_param( 'search' );
		$search = ! empty( $search ) ? sanitize_text_field( $search ) : '';
		$ids    = $request->get_param( 'ids' );

		opopw_log( 'ResourceController: Searching products with term: ' . $search, 'DEBUG' );

		// If specific IDs requested, return only those (for resolving pre-selected values)
		if ( ! empty( $ids ) ) {
			$id_list  = array_map( 'absint', explode( ',', sanitize_text_field( $ids ) ) );
			$products = array();
			foreach ( $id_list as $pid ) {
				$product = wc_get_product( $pid );
				if ( $product ) {
					$products[] = $this->format_product( $product );
				}
			}
			return rest_ensure_response( $products );
		}

		$products = array();

		// Check if search term is a numeric ID
		if ( ! empty( $search ) && is_numeric( $search ) ) {
			$product_by_id = wc_get_product( absint( $search ) );
			if ( $product_by_id && $product_by_id->get_status() === 'publish' ) {
				$products[] = $this->format_product( $product_by_id );
			}
		}

		// Search by SKU
		if ( ! empty( $search ) ) {
			$sku_product_id = wc_get_product_id_by_sku( $search );
			if ( $sku_product_id && ! $this->product_exists_in_array( $products, $sku_product_id ) ) {
				$sku_product = wc_get_product( $sku_product_id );
				if ( $sku_product && $sku_product->get_status() === 'publish' ) {
					$products[] = $this->format_product( $sku_product );
				}
			}
		}

		// Search by name using wc_get_products
		$args = array(
			'status'  => 'publish',
			'limit'   => 50,
			'orderby' => 'title',
			'order'   => 'ASC',
			'type'    => array( 'simple', 'variable' ),
		);

		if ( ! empty( $search ) ) {
			$args['s'] = $search;
		}

		$wc_products = wc_get_products( $args );

		foreach ( $wc_products as $wc_product ) {
			// Skip if already added via ID or SKU search
			if ( $this->product_exists_in_array( $products, $wc_product->get_id() ) ) {
				continue;
			}

			$products[] = $this->format_product( $wc_product );
		}

		opopw_log( 'ResourceController: Found ' . count( $products ) . ' products', 'DEBUG' );

		return rest_ensure_response( $products );
	}

	/**
	 * Format a WC_Product into the response structure.
	 *
	 * Returns an object with value, label, sku, image, and variants
	 * that is compatible with ClassicMultiSelect + custom renderOption.
	 *
	 * @since 1.0.0
	 * @param \WC_Product $product The WooCommerce product object.
	 * @return array Formatted product data.
	 */
	private function format_product( $product ) {
		$thumbnail_id = $product->get_image_id();
		$image_url    = $thumbnail_id
			? wp_get_attachment_image_url( $thumbnail_id, 'thumbnail' )
			: wc_placeholder_img_src( 'thumbnail' );

		$formatted = array(
			'value'    => $product->get_id(),
			'label'    => $product->get_name(),
			'sku'      => $product->get_sku() ? $product->get_sku() : '',
			'image'    => $image_url ? $image_url : '',
			'variants' => array(),
		);

		// Include variants for variable products
		if ( $product->is_type( 'variable' ) ) {
			$variation_ids = $product->get_children();
			foreach ( $variation_ids as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( $variation && $variation->get_status() === 'publish' ) {
					$formatted['variants'][] = array(
						'value' => $variation->get_id(),
						'label' => $variation->get_name(),
					);
				}
			}
		}

		return $formatted;
	}

	/**
	 * Check if a product ID already exists in the results array.
	 *
	 * @since 1.0.0
	 * @param array $products The current products array.
	 * @param int   $product_id The product ID to check.
	 * @return bool
	 */
	private function product_exists_in_array( $products, $product_id ) {
		foreach ( $products as $p ) {
			if ( $p['value'] === $product_id ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Get product categories with product count.
	 *
	 * Returns categories in ClassicMultiSelect-compatible format.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public function get_categories( $request ) {
		$search = $request->get_param( 'search' );
		$ids    = $request->get_param( 'ids' );

		// If specific IDs requested, return only those
		if ( ! empty( $ids ) ) {
			$id_list    = array_map( 'absint', explode( ',', sanitize_text_field( $ids ) ) );
			$terms      = get_terms(
				array(
					'taxonomy'   => 'product_cat',
					'include'    => $id_list,
					'hide_empty' => false,
				)
			);
			$categories = array();
			if ( ! is_wp_error( $terms ) ) {
				foreach ( $terms as $term ) {
					$categories[] = array(
						'value' => $term->term_id,
						'label' => $term->name . ' (' . $term->count . ')',
						'count' => $term->count,
					);
				}
			}
			return rest_ensure_response( $categories );
		}

		$args = array(
			'taxonomy'   => 'product_cat',
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
			'number'     => 50,
		);

		if ( ! empty( $search ) ) {
			$args['search'] = sanitize_text_field( $search );
		}

		$terms      = get_terms( $args );
		$categories = array();

		if ( ! is_wp_error( $terms ) ) {
			foreach ( $terms as $term ) {
				$categories[] = array(
					'value' => $term->term_id,
					'label' => $term->name . ' (' . $term->count . ')',
					'count' => $term->count,
				);
			}
		}

		opopw_log( 'ResourceController: Found ' . count( $categories ) . ' categories', 'DEBUG' );

		return rest_ensure_response( $categories );
	}

	/**
	 * Get product tags with product count.
	 *
	 * Returns tags in ClassicMultiSelect-compatible format.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response
	 */
	public function get_tags( $request ) {
		$search = $request->get_param( 'search' );
		$ids    = $request->get_param( 'ids' );

		// If specific IDs requested, return only those
		if ( ! empty( $ids ) ) {
			$id_list = array_map( 'absint', explode( ',', sanitize_text_field( $ids ) ) );
			$terms   = get_terms(
				array(
					'taxonomy'   => 'product_tag',
					'include'    => $id_list,
					'hide_empty' => false,
				)
			);
			$tags    = array();
			if ( ! is_wp_error( $terms ) ) {
				foreach ( $terms as $term ) {
					$tags[] = array(
						'value' => $term->term_id,
						'label' => $term->name . ' (' . $term->count . ')',
						'count' => $term->count,
					);
				}
			}
			return rest_ensure_response( $tags );
		}

		$args = array(
			'taxonomy'   => 'product_tag',
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
			'number'     => 50,
		);

		if ( ! empty( $search ) ) {
			$args['search'] = sanitize_text_field( $search );
		}

		$terms = get_terms( $args );
		$tags  = array();

		if ( ! is_wp_error( $terms ) ) {
			foreach ( $terms as $term ) {
				$tags[] = array(
					'value' => $term->term_id,
					'label' => $term->name . ' (' . $term->count . ')',
					'count' => $term->count,
				);
			}
		}

		opopw_log( 'ResourceController: Found ' . count( $tags ) . ' tags', 'DEBUG' );

		return rest_ensure_response( $tags );
	}

	/**
	 * Gets an instance of this class.
	 *
	 * @since 1.0.0
	 * @return ResourceController
	 */
	public static function get_instance() {
		static $instance = null;
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
}
