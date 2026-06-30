<?php
/**
 * Inventory Controller — REST API handling for inventory items.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Api
 */

namespace Opopw\Api;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use Opopw\Data\InventoryManager;

/**
 * REST API controller for Inventory Items.
 *
 * Endpoints:
 *   GET    /optionbay-product-options-addons-woo/v1/inventory         - Search inventory items
 *   POST   /optionbay-product-options-addons-woo/v1/inventory         - Create inventory item
 *   PUT    /optionbay-product-options-addons-woo/v1/inventory/{id}    - Update inventory item
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Api
 */
class InventoryController extends ApiController {


	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var   InventoryController
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @static
	 * @access public
	 * @return InventoryController
	 * @since 1.0.0
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register REST routes for inventory.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes() {
		$namespace = $this->namespace . '/' . $this->version;

		// GET /inventory (search)
		register_rest_route(
			$namespace,
			'/inventory',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
					'args'                => array(
						'search' => array(
							'default'           => '',
							'sanitize_callback' => 'sanitize_text_field',
						),
						'limit'  => array(
							'default'           => 20,
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
			)
		);

		// GET/PUT /inventory/{id}
		register_rest_route(
			$namespace,
			'/inventory/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'validate_callback' => function ( $param ) {
								return is_numeric( $param );
							},
						),
					),
				),
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'update_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'validate_callback' => function ( $param ) {
								return is_numeric( $param );
							},
						),
					),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'delete_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'validate_callback' => function ( $param ) {
								return is_numeric( $param );
							},
						),
					),
				),
			)
		);
	}

	/**
	 * Get a single inventory item.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_item( $request ) {
		$id = $request->get_param( 'id' );
		opopw_log( sprintf( 'InventoryController: Fetching single inventory ID %d.', $id ), 'DEBUG' );
		$item = InventoryManager::get_instance()->get_item( $id );

		if ( ! $item ) {
			return new WP_Error( 'not_found', __( 'Inventory item not found', 'optionbay-product-options-addons-woo' ), array( 'status' => 404 ) );
		}

		return new WP_REST_Response( $item, 200 );
	}

	/**
	 * Search inventory items.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_items( $request ) {
		$search = $request->get_param( 'search' );
		$limit  = $request->get_param( 'limit' );
		opopw_log( sprintf( 'InventoryController: Searching inventory with term "%s" (Limit: %d).', $search, $limit ), 'DEBUG' );

		$items = InventoryManager::get_instance()->search_items( $search, $limit );

		return new WP_REST_Response( $items, 200 );
	}

	/**
	 * Create an inventory item.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_item( $request ) {
		$validated = $this->validate(
			$request,
			array(
				'name'             => 'required|min:1',
				'stock_count'      => 'numeric',
				'allow_backorders' => 'boolean',
			)
		);

		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		opopw_log( sprintf( 'InventoryController: Creating inventory item. Data: %s', wp_json_encode( $validated ) ), 'INFO' );
		$id = InventoryManager::get_instance()->create_item( $validated );

		if ( ! $id ) {
			return new WP_Error( 'create_failed', __( 'Failed to create inventory item', 'optionbay-product-options-addons-woo' ), array( 'status' => 500 ) );
		}

		$item = InventoryManager::get_instance()->get_item( $id );

		return new WP_REST_Response( $item, 201 );
	}

	/**
	 * Update an inventory item.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_item( $request ) {
		$id = $request->get_param( 'id' );

		$validated = $this->validate(
			$request,
			array(
				'name'             => 'min:1',
				'stock_count'      => 'numeric',
				'allow_backorders' => 'boolean',
			)
		);

		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		opopw_log( sprintf( 'InventoryController: Updating inventory item ID %d. Data: %s', $id, wp_json_encode( $validated ) ), 'INFO' );
		$result = InventoryManager::get_instance()->update_item( $id, $validated );

		if ( false === $result ) {
			return new WP_Error( 'update_failed', __( 'Failed to update inventory item', 'optionbay-product-options-addons-woo' ), array( 'status' => 500 ) );
		}

		$item = InventoryManager::get_instance()->get_item( $id );

		return new WP_REST_Response( $item, 200 );
	}

	/**
	 * Delete an inventory item.
	 *
	 * @since 1.2.0
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_item( $request ) {
		$id = $request->get_param( 'id' );

		opopw_log( sprintf( 'InventoryController: Deleting inventory ID %d.', $id ), 'INFO' );

		global $wpdb;
		$used_in = array();

		// Fetch all active Option Groups and check their schema
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$groups = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.ID, p.post_title, pm.meta_value 
			FROM {$wpdb->posts} p 
			INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id 
			WHERE p.post_type = %s 
			AND p.post_status != 'trash'
			AND pm.meta_key = %s",
				\Opopw\Core\AddonGroup::POST_TYPE,
				\Opopw\Core\AddonGroup::META_SCHEMA
			)
		);

		foreach ( $groups as $group ) {
			$schema = json_decode( $group->meta_value, true );
			if ( is_array( $schema ) && $this->is_inventory_used_in_schema( $schema, $id ) ) {
				$used_in[] = array(
					'id'   => $group->ID,
					'name' => $group->post_title,
				);
			}
		}

		if ( ! empty( $used_in ) ) {
			return new WP_Error(
				'inventory_in_use',
				__( 'This inventory is currently being used by one or more option groups. It cannot be deleted.', 'optionbay-product-options-addons-woo' ),
				array(
					'status' => 400,
					'groups' => $used_in,
				)
			);
		}

		// Delete it
		$deleted = InventoryManager::get_instance()->delete_item( $id );

		if ( ! $deleted ) {
			return new WP_Error( 'delete_failed', __( 'Failed to delete inventory item.', 'optionbay-product-options-addons-woo' ), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	/**
	 * Recursively check if an inventory ID is used within an Option Group schema.
	 *
	 * @since 1.2.0
	 * @param array $schema       The option group schema.
	 * @param int   $inventory_id The inventory ID to search for.
	 * @return bool
	 */
	private function is_inventory_used_in_schema( $schema, $inventory_id ) {
		foreach ( $schema as $field ) {
			// Check field level
			if ( ! empty( $field['enable_stock'] ) && isset( $field['inventory_id'] ) ) {
				if ( (string) $field['inventory_id'] === (string) $inventory_id ) {
					return true;
				}
			}
			// Check option level (for choice fields)
			if ( ! empty( $field['options'] ) && is_array( $field['options'] ) ) {
				foreach ( $field['options'] as $option ) {
					if ( ! empty( $option['enable_stock'] ) && isset( $option['inventory_id'] ) ) {
						if ( (string) $option['inventory_id'] === (string) $inventory_id ) {
							return true;
						}
					}
				}
			}
		}
		return false;
	}
}
