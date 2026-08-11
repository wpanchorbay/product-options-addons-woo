<?php
/**
 * Addon Group Controller — REST API handling for options.
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
use Opopw\Core\AddonGroup;
use Opopw\Data\DbManager;

/**
 * REST API controller for Option Groups (CRUD + assignment sync).
 *
 * Endpoints:
 *   GET    /optionbay-product-options-addons-woo/v1/groups         - List all groups
 *   GET    /optionbay-product-options-addons-woo/v1/groups/{id}    - Get single group
 *   POST   /optionbay-product-options-addons-woo/v1/groups         - Create group
 *   PUT    /optionbay-product-options-addons-woo/v1/groups/{id}    - Update group
 *   DELETE /optionbay-product-options-addons-woo/v1/groups/{id}    - Delete group
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Api
 */
class AddonGroupController extends ApiController {




	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var   AddonGroupController
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @static
	 * @access public
	 * @return AddonGroupController
	 * @since 1.0.0
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register REST routes for option groups.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_routes() {
		$namespace = $this->namespace . '/' . $this->version;

		// GET /groups (list all)
		register_rest_route(
			$namespace,
			'/groups',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_items' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
					'args'                => array(
						'page'     => array(
							'default'           => 1,
							'sanitize_callback' => 'absint',
						),
						'per_page' => array(
							'default'           => 20,
							'sanitize_callback' => 'absint',
						),
						'search'   => array(
							'default'           => '',
							'sanitize_callback' => 'sanitize_text_field',
						),
						'status'   => array(
							'default'           => 'any',
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
				// POST /groups (create)
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
				),
			)
		);

		// GET/PUT/DELETE /groups/{id}
		register_rest_route(
			$namespace,
			'/groups/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_item' ),
					'permission_callback' => array( $this, 'get_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'validate_callback' => function ( $param ) {
								return is_numeric( $param ) && $param > 0;
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
								return is_numeric( $param ) && $param > 0;
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
								return is_numeric( $param ) && $param > 0;
							},
						),
					),
				),
			)
		);

		// POST /groups/{id}/duplicate
		register_rest_route(
			$namespace,
			'/groups/(?P<id>\\d+)/duplicate',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'duplicate_item' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => array(
						'id' => array(
							'validate_callback' => function ( $param ) {
								return is_numeric( $param ) && $param > 0;
							},
						),
					),
				),
			)
		);

		// PUT /groups/{id}/status
		register_rest_route(
			$namespace,
			'/groups/(?P<id>\\d+)/status',
			array(
				array(
					'methods'             => 'PUT',
					'callback'            => array( $this, 'update_status' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => array(
						'id'     => array(
							'validate_callback' => function ( $param ) {
								return is_numeric( $param ) && $param > 0;
							},
						),
						'status' => array(
							'required'          => true,
							'validate_callback' => function ( $param ) {
								return in_array( $param, array( 'publish', 'draft' ), true );
							},
						),
					),
				),
			)
		);

		// POST /groups/bulk
		register_rest_route(
			$namespace,
			'/groups/bulk',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'bulk_action' ),
					'permission_callback' => array( $this, 'update_item_permissions_check' ),
					'args'                => array(
						'action' => array(
							'required' => true,
							'type'     => 'string',
							'enum'     => array( 'delete', 'activate', 'draft', 'restore' ),
						),
						'ids'    => array(
							'required' => true,
							'type'     => 'array',
							'items'    => array( 'type' => 'integer' ),
						),
					),
				),
			)
		);
	}

	/**
	 * List all option groups with pagination.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_items( $request ) {
		opopw_log( 'AddonGroupController: Fetching multiple items (GET /groups).', 'DEBUG' );

		$page     = $request->get_param( 'page' );
		$per_page = min( $request->get_param( 'per_page' ), 100 );
		$search   = $request->get_param( 'search' );
		$status   = $request->get_param( 'status' ) ? $request->get_param( 'status' ) : 'any';

		$args = array(
			'post_type'      => AddonGroup::POST_TYPE,
			'posts_per_page' => $per_page,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);

		// Status filter
		if ( 'any' === $status ) {
			$args['post_status'] = array( 'publish', 'draft' );
		} else {
			$args['post_status'] = $status;
		}

		// Search filter
		if ( ! empty( $search ) ) {
			$args['s'] = $search;
		}

		$query = new \WP_Query( $args );
		$items = array();

		$db = DbManager::get_instance();

		foreach ( $query->posts as $post ) {
			$schema      = json_decode( get_post_meta( $post->ID, AddonGroup::META_SCHEMA, true ), true );
			$assignments = $db->get_assignments_for_group( $post->ID );

			$items[] = array(
				'id'               => $post->ID,
				'title'            => $post->post_title,
				'status'           => $post->post_status,
				'field_count'      => is_array( $schema ) ? count( $schema ) : 0,
				'assignments'      => is_array( $assignments ) ? $assignments : array(),
				'author_name'      => get_the_author_meta( 'display_name', $post->post_author ),
				'modified_by_name' => get_the_author_meta( 'display_name', get_post_meta( $post->ID, '_edit_last', true ) ? get_post_meta( $post->ID, '_edit_last', true ) : $post->post_author ),
				'date_created'     => $post->post_date,
				'date_modified'    => $post->post_modified,
			);
		}

		$counts = wp_count_posts( AddonGroup::POST_TYPE );

		return new WP_REST_Response(
			array(
				'items'       => $items,
				'total'       => (int) $query->found_posts,
				'total_pages' => (int) $query->max_num_pages,
				'page'        => (int) $page,
				'per_page'    => (int) $per_page,
				'counts'      => array(
					'all'     => (int) $counts->publish + (int) $counts->draft,
					'publish' => (int) $counts->publish,
					'draft'   => (int) $counts->draft,
					'trash'   => (int) $counts->trash,
				),
			),
			200
		);
	}

	/**
	 * Get a single option group by ID.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_item( $request ) {
		$id = absint( $request->get_param( 'id' ) );
		opopw_log( "AddonGroupController: Fetching single item ID {$id} (GET /groups/{$id}).", 'DEBUG' );

		$post = get_post( $id );

		if ( ! $post || AddonGroup::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'not_found',
				__( 'Option group not found.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 404 )
			);
		}

		$schema      = json_decode( get_post_meta( $id, AddonGroup::META_SCHEMA, true ), true );
		$assignments = DbManager::get_instance()->get_assignments_for_group( $id );

		return new WP_REST_Response(
			array(
				'id'               => $post->ID,
				'title'            => $post->post_title,
				'status'           => $post->post_status,
				'schema'           => is_array( $schema ) ? $schema : array(),
				'assignments'      => is_array( $assignments ) ? $assignments : array(),
				'author_name'      => get_the_author_meta( 'display_name', $post->post_author ),
				'modified_by_name' => get_the_author_meta( 'display_name', get_post_meta( $id, '_edit_last', true ) ? get_post_meta( $id, '_edit_last', true ) : $post->post_author ),
				'date_created'     => $post->post_date,
				'date_modified'    => $post->post_modified,
			),
			200
		);
	}

	/**
	 * Create a new option group.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 * @throws \Exception On failure.
	 */
	public function create_item( $request ) {
		opopw_log( 'AddonGroupController: Creating new item (POST /groups).', 'INFO' );

		$validated = $this->validate(
			$request,
			$this->get_validation_rules(),
			$this->get_validation_messages(),
			$this->get_validation_aliases()
		);

		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		$title           = $validated['title'];
		$schema          = $validated['schema'];
		$assignments     = $validated['assignments'] ?? array();
		$status          = $validated['status'];
		$new_inventories = $validated['new_inventories'] ?? array();

		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'START TRANSACTION' );

		try {
			// 1. Process new inventories (Handshake)
			$id_map = array();
			foreach ( $new_inventories as $new_inv ) {
				$inv_id = \Opopw\Data\InventoryManager::get_instance()->create_item( $new_inv );
				if ( ! inv_id ) {
					throw new \Exception( __( 'Failed to create global inventory item.', 'optionbay-product-options-addons-woo' ) );
				}
				$id_map[ $new_inv['tmp_id'] ] = $inv_id;
				opopw_log( sprintf( 'AddonGroupController: Created global inventory item %d for tmp_id %s.', $inv_id, $new_inv['tmp_id'] ), 'DEBUG' );
			}

			// 2. Swap temporary IDs in schema
			$schema = $this->swap_inventory_ids( $schema, $id_map );

			// 3. Sanitize the schema fields
			$schema = $this->sanitize_schema( $schema );

			// 4. Create the CPT post
			$post_id = wp_insert_post(
				array(
					'post_type'   => AddonGroup::POST_TYPE,
					'post_title'  => $title,
					'post_status' => $status,
				),
				true
			);

			if ( is_wp_error( $post_id ) ) {
				throw new \Exception( $post_id->get_error_message() );
			}

			opopw_log( sprintf( 'AddonGroupController: Created CPT post ID %d with title "%s" and status "%s".', $post_id, $title, $status ), 'INFO' );

			// 5. Save schema as post meta
			$encoded_schema = wp_json_encode( $schema );
			update_post_meta( $post_id, AddonGroup::META_SCHEMA, wp_slash( $encoded_schema ) );
			opopw_log( sprintf( 'AddonGroupController: Saved schema JSON meta for post ID %d.', $post_id ), 'DEBUG' );

			// 6. Sync assignments
			if ( ! empty( $assignments ) ) {
				DbManager::get_instance()->sync_assignments( $post_id, $assignments );
				opopw_log( sprintf( 'AddonGroupController: Synced assignments for post ID %d.', $post_id ), 'DEBUG' );
			}

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query( 'COMMIT' );

			// Invalidate cache
			$this->invalidate_cache( $post_id );

			return new WP_REST_Response(
				array(
					'success' => true,
					'id'      => $post_id,
					'message' => __( 'Option group created successfully.', 'optionbay-product-options-addons-woo' ),
				),
				201
			);

		} catch ( \Exception $e ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query( 'ROLLBACK' );
			opopw_log( 'AddonGroupController: Failed to create addon group CPT. Error: ' . $e->getMessage(), 'ERROR' );
			return new WP_Error( 'create_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}

	/**
	 * Update an existing option group.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 * @throws \Exception On failure.
	 */
	public function update_item( $request ) {

		$id = absint( $request->get_param( 'id' ) );
		opopw_log( "AddonGroupController: Updating item ID {$id} (PUT /groups/{$id}).", 'INFO' );

		$post = get_post( $id );

		if ( ! $post || AddonGroup::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'not_found',
				__( 'Option group not found.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 404 )
			);
		}

		$validated = $this->validate(
			$request,
			$this->get_validation_rules(),
			$this->get_validation_messages(),
			$this->get_validation_aliases()
		);

		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		// Update title if provided
		if ( isset( $validated['title'] ) ) {
			wp_update_post(
				array(
					'ID'         => $id,
					'post_title' => $validated['title'],
				)
			);
		}

		// Update status if provided
		if ( isset( $validated['status'] ) ) {
			wp_update_post(
				array(
					'ID'          => $id,
					'post_status' => $validated['status'],
				)
			);
		}

		// Update schema if provided
		if ( isset( $validated['schema'] ) || ! empty( $validated['new_inventories'] ) ) {
			$new_inventories = $validated['new_inventories'] ?? array();

			global $wpdb;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->query( 'START TRANSACTION' );

			try {
				// Handshake
				$id_map = array();
				foreach ( $new_inventories as $new_inv ) {
					$inv_id = \Opopw\Data\InventoryManager::get_instance()->create_item( $new_inv );
					if ( ! inv_id ) {
						throw new \Exception( __( 'Failed to create global inventory item.', 'optionbay-product-options-addons-woo' ) );
					}
					$id_map[ $new_inv['tmp_id'] ] = $inv_id;
					opopw_log( sprintf( 'AddonGroupController: Created global inventory item %d for tmp_id %s.', $inv_id, $new_inv['tmp_id'] ), 'DEBUG' );
				}

				$schema = $validated['schema'] ?? json_decode( get_post_meta( $id, AddonGroup::META_SCHEMA, true ), true );

				// Swap IDs
				$schema = $this->swap_inventory_ids( $schema, $id_map );

				// Sanitize and save
				$schema = $this->sanitize_schema( $schema );

				$encoded_schema = wp_json_encode( $schema );
				update_post_meta( $id, AddonGroup::META_SCHEMA, wp_slash( $encoded_schema ) );
				opopw_log( sprintf( 'AddonGroupController: Updated schema JSON meta for post ID %d.', $id ), 'DEBUG' );

				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->query( 'COMMIT' );
			} catch ( \Exception $e ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->query( 'ROLLBACK' );
				opopw_log( sprintf( 'AddonGroupController: Failed to update addon group ID %d. Error: %s', $id, $e->getMessage() ), 'ERROR' );
				return new WP_Error( 'update_failed', $e->getMessage(), array( 'status' => 500 ) );
			}
		}

		// Sync assignments (delete & re-insert)
		if ( isset( $validated['assignments'] ) ) {
			DbManager::get_instance()->sync_assignments( $id, $validated['assignments'] );
			opopw_log( sprintf( 'AddonGroupController: Synced assignments for post ID %d.', $id ), 'DEBUG' );
		}

		// Invalidate cache
		$this->invalidate_cache( $id );

		return new WP_REST_Response(
			array(
				'success'  => true,
				'id'       => $id,
				'message'  => __( 'Option group updated successfully.', 'optionbay-product-options-addons-woo' ),
				'modified' => current_time( 'mysql' ),
			),
			200
		);
	}

	/**
	 * Delete an option group and its assignments.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function delete_item( $request ) {
		$id = absint( $request->get_param( 'id' ) );
		opopw_log( "AddonGroupController: Deleting/Trashing item ID {$id} (DELETE /groups/{$id}).", 'WARNING' );

		$post = get_post( $id );

		if ( ! $post || AddonGroup::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'rest_not_found',
				__( 'Option group not found.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 404 )
			);
		}

		// If it's already in trash, delete permanently
		if ( 'trash' === $post->post_status ) {
			// Delete assignments from lookup table
			DbManager::get_instance()->delete_assignments_for_group( $id );

			$deleted = wp_delete_post( $id, true );
			$message = __( 'Option group permanently deleted.', 'optionbay-product-options-addons-woo' );
		} else {
			// Move to trash
			$deleted = wp_trash_post( $id );
			$message = __( 'Option group moved to trash.', 'optionbay-product-options-addons-woo' );
		}

		if ( ! $deleted ) {
			return new WP_Error(
				'delete_failed',
				__( 'Failed to delete option group.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 500 )
			);
		}

		// Invalidate cache
		$this->invalidate_cache( $id );

		return new WP_REST_Response(
			array(
				'success' => true,
				'message' => $message,
			),
			200
		);
	}

	/**
	 * Duplicate an existing option group.
	 *
	 * Copies the post, its meta (schema, settings), and its assignments.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function duplicate_item( $request ) {
		$id = absint( $request->get_param( 'id' ) );
		opopw_log( "AddonGroupController: Duplicating item ID {$id} (POST /groups/{$id}/duplicate).", 'INFO' );

		$post = get_post( $id );

		if ( ! $post || AddonGroup::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'not_found',
				__( 'Option group not found.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 404 )
			);
		}

		// Prepare duplicate data
		$new_title   = $post->post_title . ' ' . __( '(Copy)', 'optionbay-product-options-addons-woo' );
		$schema      = get_post_meta( $id, AddonGroup::META_SCHEMA, true );
		$settings    = get_post_meta( $id, AddonGroup::META_SETTINGS, true );
		$assignments = DbManager::get_instance()->get_assignments_for_group( $id );

		// Insert new post
		$new_id = wp_insert_post(
			array(
				'post_type'   => AddonGroup::POST_TYPE,
				'post_title'  => $new_title,
				'post_status' => $post->post_status,
			),
			true
		);

		if ( is_wp_error( $new_id ) ) {
			return new WP_Error(
				'duplicate_failed',
				__( 'Failed to duplicate option group.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 500 )
			);
		}

		// Copy meta
		if ( ! empty( $schema ) ) {
			update_post_meta( $new_id, AddonGroup::META_SCHEMA, $schema );
		}
		if ( ! empty( $settings ) ) {
			update_post_meta( $new_id, AddonGroup::META_SETTINGS, $settings );
		}

		// Copy assignments
		if ( ! empty( $assignments ) ) {
			DbManager::get_instance()->insert_assignments( $new_id, $assignments );
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'id'      => $new_id,
				'message' => __( 'Option group duplicated successfully.', 'optionbay-product-options-addons-woo' ),
			),
			201
		);
	}

	/**
	 * Update only the status of an option group.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_status( $request ) {
		$id     = absint( $request->get_param( 'id' ) );
		$status = sanitize_text_field( $request->get_param( 'status' ) );
		opopw_log( "AddonGroupController: Updating status of group ID {$id} to {$status} (PUT /groups/{$id}/status).", 'INFO' );

		$post = get_post( $id );

		if ( ! $post || AddonGroup::POST_TYPE !== $post->post_type ) {
			return new WP_Error(
				'not_found',
				__( 'Option group not found.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 404 )
			);
		}

		$updated = wp_update_post(
			array(
				'ID'          => $id,
				'post_status' => $status,
			),
			true
		);

		if ( is_wp_error( $updated ) ) {
			return new WP_Error(
				'status_update_failed',
				__( 'Failed to update status.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'id'      => $id,
				'status'  => $status,
			),
			200
		);
	}

	/**
	 * Process a bulk action on option groups.
	 *
	 * Supports 'delete', 'activate', and 'draft' actions.
	 *
	 * @since 1.0.0
	 * @param \WP_REST_Request $request The REST request object.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function bulk_action( $request ) {
		$action = $request->get_param( 'action' );
		$ids    = $request->get_param( 'ids' );

		if ( ! is_array( $ids ) || empty( $ids ) ) {
			return new WP_Error(
				'invalid_ids',
				__( 'No option group IDs provided.', 'optionbay-product-options-addons-woo' ),
				array( 'status' => 400 )
			);
		}

		$processed = 0;
		$failed    = 0;

		$db = DbManager::get_instance();

		foreach ( $ids as $id ) {
			$id = absint( $id );
			if ( ! $id ) {
				continue;
			}

			$post = get_post( $id );
			if ( ! $post || AddonGroup::POST_TYPE !== $post->post_type ) {
				++$failed;
				continue;
			}

			switch ( $action ) {
				case 'delete':
					if ( 'trash' === $post->post_status ) {
						// Delete assignments from lookup table first
						$db->delete_assignments_for_group( $id );
						// Delete the post permanently
						$success = (bool) wp_delete_post( $id, true );
					} else {
						// Move to trash
						$success = (bool) wp_trash_post( $id );
					}

					if ( $success ) {
						++$processed;
						$this->invalidate_cache( $id );
					} else {
						++$failed;
					}
					break;

				case 'activate':
				case 'draft':
					if ( 'trash' === $post->post_status ) {
						wp_untrash_post( $id );
					}
					$status = ( 'activate' === $action ) ? 'publish' : 'draft';
					$result = wp_update_post(
						array(
							'ID'          => $id,
							'post_status' => $status,
						),
						true
					);

					if ( ! is_wp_error( $result ) ) {
						++$processed;
						$this->invalidate_cache( $id );
					} else {
						++$failed;
					}
					break;

				case 'restore':
					if ( wp_untrash_post( $id ) ) {
						++$processed;
						$this->invalidate_cache( $id );
					} else {
						++$failed;
					}
					break;
			}
		}

		return new WP_REST_Response(
			array(
				'success'   => $processed > 0,
				'processed' => $processed,
				'failed'    => $failed,
				'message'   => sprintf(
					/* translators: 1: action name, 2: processed count, 3: failed count */
					__( 'Bulk action "%1$s" completed. Success: %2$d, Failed: %3$d.', 'optionbay-product-options-addons-woo' ),
					sanitize_text_field( $action ),
					$processed,
					$failed
				),
			),
			200
		);
	}

	/**
	 * Sanitize the schema array.
	 *
	 * Ensures each field has required properties and sanitizes values.
	 *
	 * @since 1.0.0
	 * @param array $schema Raw schema array.
	 * @return array Sanitized schema.
	 */
	private function sanitize_schema( $schema ) {
		if ( ! is_array( $schema ) ) {
			return array();
		}

		$allowed_types       = apply_filters( 'opopw_allowed_field_types', array( 'text', 'textarea', 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch', 'number', 'static_content', 'email', 'single_checkbox', 'date', 'time', 'datetime' ) );
		$allowed_price_types = array( 'none', 'flat', 'percentage' );

		$sanitized = array();

		foreach ( $schema as $field ) {
			if ( ! is_array( $field ) || empty( $field['id'] ) ) {
				continue;
			}

			$clean_field = array(
				'id'             => sanitize_text_field( $field['id'] ),
				'type'           => in_array( $field['type'] ?? '', $allowed_types, true ) ? $field['type'] : 'text',
				'label'          => sanitize_text_field( $field['label'] ?? '' ),
				'description'    => sanitize_textarea_field( $field['description'] ?? '' ),
				'placeholder'    => sanitize_text_field( $field['placeholder'] ?? '' ),
				'required'       => ! empty( $field['required'] ),
				'class_name'     => sanitize_html_class( $field['class_name'] ?? '' ),
				'price_type'     => in_array( $field['price_type'] ?? 'none', $allowed_price_types, true )
					? ( $field['price_type'] ?? 'none' )
					: 'none',
				'price'          => floatval( $field['price'] ?? 0 ),
				'weight'         => floatval( $field['weight'] ?? 0 ),
				'enable_stock'   => ! empty( $field['enable_stock'] ),
				'inventory_id'   => $field['inventory_id'] ?? null,
				'reduction_mode' => $field['reduction_mode'] ?? 'per_item_qty',
			);

			$options_have_stock = false;

			// Sanitize options for select/radio/checkbox
			if ( isset( $field['options'] ) && is_array( $field['options'] ) ) {
				$clean_field['options'] = array();
				foreach ( $field['options'] as $option ) {
					if ( ! is_array( $option ) ) {
						continue;
					}
					$clean_option = array(
						'label'            => sanitize_text_field( $option['label'] ?? '' ),
						'value'            => sanitize_text_field( $option['value'] ?? '' ),
						'price_type'       => in_array( $option['price_type'] ?? 'flat', $allowed_price_types, true )
							? ( $option['price_type'] ?? 'flat' )
							: 'flat',
						'price'            => floatval( $option['price'] ?? 0 ),
						'weight'           => floatval( $option['weight'] ?? 0 ),
						'color'            => sanitize_text_field( $option['color'] ?? '' ),
						'image_url'        => esc_url_raw( $option['image_url'] ?? '' ),
						'enable_stock'     => ! empty( $option['enable_stock'] ),
						'inventory_id'     => $option['inventory_id'] ?? null,
						'reduction_mode'   => $option['reduction_mode'] ?? 'per_item_qty',
						'linked_image_id'  => isset( $option['linked_image_id'] ) ? intval( $option['linked_image_id'] ) : null,
						'linked_image_url' => isset( $option['linked_image_url'] ) ? esc_url_raw( $option['linked_image_url'] ) : '',
					);
					if ( ! empty( $clean_option['enable_stock'] ) ) {
						$options_have_stock = true;
					}
					$clean_field['options'][] = $clean_option;
				}
			}

			// If any choice has stock tracking enabled, the field itself cannot have stock tracking enabled
			$has_options = in_array( $clean_field['type'], array( 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch' ), true );
			if ( $has_options && $options_have_stock ) {
				$clean_field['enable_stock'] = false;
				$clean_field['inventory_id'] = null;
			}

			// Preserve type-specific settings
			if ( isset( $field['min_length'] ) ) {
				$clean_field['min_length'] = absint( $field['min_length'] );
			}
			if ( isset( $field['max_length'] ) ) {
				$clean_field['max_length'] = absint( $field['max_length'] );
			}
			if ( isset( $field['min_value'] ) ) {
				$clean_field['min_value'] = floatval( $field['min_value'] );
			}
			if ( isset( $field['max_value'] ) ) {
				$clean_field['max_value'] = floatval( $field['max_value'] );
			}
			if ( isset( $field['step'] ) ) {
				$clean_field['step'] = floatval( $field['step'] );
			}
			if ( isset( $field['min_date'] ) ) {
				$clean_field['min_date'] = sanitize_text_field( $field['min_date'] );
			}
			if ( isset( $field['max_date'] ) ) {
				$clean_field['max_date'] = sanitize_text_field( $field['max_date'] );
			}
			if ( isset( $field['min_time'] ) ) {
				$clean_field['min_time'] = sanitize_text_field( $field['min_time'] );
			}
			if ( isset( $field['max_time'] ) ) {
				$clean_field['max_time'] = sanitize_text_field( $field['max_time'] );
			}

			if ( isset( $field['display_style'] ) ) {
				$clean_field['display_style'] = sanitize_text_field( $field['display_style'] );
			}
			if ( isset( $field['content'] ) ) {
				$clean_field['content'] = wp_kses_post( $field['content'] );
			}

			// Sanitize conditional logic
			if ( isset( $field['conditions'] ) && is_array( $field['conditions'] ) ) {
				$clean_field['conditions'] = $this->sanitize_conditions( $field['conditions'] );
			} else {
				$clean_field['conditions'] = array(
					'status' => 'inactive',
				);
			}

			$sanitized[] = $clean_field;
		}

		return $sanitized;
	}

	/**
	 * Sanitize conditional logic block.
	 *
	 * @since 1.0.0
	 * @param array $conditions Raw conditions array.
	 * @return array Sanitized conditions.
	 */
	private function sanitize_conditions( $conditions ) {
		$clean = array(
			'status' => in_array( $conditions['status'] ?? 'inactive', array( 'active', 'inactive' ), true )
				? ( $conditions['status'] ?? 'inactive' )
				: 'inactive',
			'action' => in_array( $conditions['action'] ?? 'show', array( 'show', 'hide' ), true )
				? ( $conditions['action'] ?? 'show' )
				: 'show',
			'match'  => in_array( $conditions['match'] ?? 'ALL', array( 'ALL', 'ANY' ), true )
				? ( $conditions['match'] ?? 'ALL' )
				: 'ALL',
			'rules'  => array(),
		);

		if ( isset( $conditions['rules'] ) && is_array( $conditions['rules'] ) ) {
			$allowed_operators = array( '==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains', 'empty', 'not_empty' );

			foreach ( $conditions['rules'] as $rule ) {
				if ( ! is_array( $rule ) || empty( $rule['target_field_id'] ) ) {
					continue;
				}

				$clean['rules'][] = array(
					'target_field_id' => sanitize_text_field( $rule['target_field_id'] ),
					'operator'        => in_array( $rule['operator'] ?? '==', $allowed_operators, true )
						? ( $rule['operator'] ?? '==' )
						: '==',
					'value'           => sanitize_text_field( $rule['value'] ?? '' ),
				);
			}
		}

		return $clean;
	}

	/**
	 * Swap temporary inventory IDs with real IDs in the schema.
	 *
	 * @since 1.0.0
	 * @param array $schema The schema array.
	 * @param array $id_map Map of temporary IDs to real IDs.
	 * @return array
	 */
	private function swap_inventory_ids( $schema, $id_map ) {
		if ( empty( $id_map ) || ! is_array( $schema ) ) {
			return $schema;
		}

		foreach ( $schema as &$field ) {
			if ( ! empty( $field['inventory_id'] ) && isset( $id_map[ $field['inventory_id'] ] ) ) {
				$field['inventory_id'] = $id_map[ $field['inventory_id'] ];
			}

			if ( isset( $field['options'] ) && is_array( $field['options'] ) ) {
				foreach ( $field['options'] as &$option ) {
					if ( ! empty( $option['inventory_id'] ) && isset( $id_map[ $option['inventory_id'] ] ) ) {
						$option['inventory_id'] = $id_map[ $option['inventory_id'] ];
					}
				}
			}
		}

		return $schema;
	}
	/**
	 * Invalidate cache for a specific group or all groups.
	 *
	 * Currently used as a placeholder for future performance optimizations.
	 * Could be used to clear product transients or object cache.
	 *
	 * @since 1.0.0
	 * @param int|null $group_id The group ID to invalidate, or null for all.
	 * @return void
	 */
	private function invalidate_cache( $group_id = null ) {
		opopw_log( 'AddonGroupController: Invalidating cache' . ( $group_id ? " for group ID {$group_id}" : '' ) . '.', 'DEBUG' );

		// In a future version, we could clear specific product transients here
		// if we implement front-end caching for the AddonRenderer.
	}
	/**
	 * Get the validation rules for an option group.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_validation_rules() {

		$allowed_types = apply_filters( 'opopw_allowed_field_types', array( 'text', 'textarea', 'select', 'radio', 'checkbox', 'color_swatch', 'image_swatch', 'number', 'static_content', 'email', 'single_checkbox', 'date', 'time', 'datetime' ) );
		return array(
			'title'                                       => 'required|min:3|max:255',
			'status'                                      => 'required|in:publish,draft',
			'schema'                                      => 'required|array',
			'schema.*.id'                                 => 'required',
			'schema.*.type'                               => 'required|in:' . implode( ',', $allowed_types ),
			'schema.*.content'                            => 'nullable',
			'schema.*.label'                              => 'required',
			'schema.*.description'                        => 'nullable',
			'schema.*.placeholder'                        => 'nullable',
			'schema.*.required'                           => 'boolean',
			'schema.*.class_name'                         => 'nullable',
			'schema.*.price_type'                         => 'required_with:schema|in:none,flat,percentage',
			'schema.*.price'                              => 'required_if:schema.*.price_type,flat,percentage|numeric',
			'schema.*.weight'                             => 'numeric',
			'schema.*.min_length'                         => 'numeric',
			'schema.*.max_length'                         => 'numeric',
			'schema.*.min_value'                          => 'numeric',
			'schema.*.max_value'                          => 'numeric',
			'schema.*.step'                               => 'numeric',
			'schema.*.min_date'                           => 'nullable',
			'schema.*.max_date'                           => 'nullable',
			'schema.*.min_time'                           => 'nullable',
			'schema.*.max_time'                           => 'nullable',
			'schema.*.options'                            => 'array',
			'schema.*.options.*.label'                    => 'required_with:schema.*.options',
			'schema.*.options.*.value'                    => 'required_with:schema.*.options',
			'schema.*.options.*.price_type'               => 'in:flat,none',
			'schema.*.options.*.price'                    => 'required_if:schema.*.options.*.price_type,flat|numeric',
			'schema.*.options.*.weight'                   => 'numeric',
			'schema.*.options.*.color'                    => 'required_if:schema.*.type,color_swatch',
			'schema.*.options.*.image_url'                => 'required_if:schema.*.type,image_swatch',
			'schema.*.options.*.linked_image_id'          => 'nullable|numeric',
			'schema.*.options.*.linked_image_url'         => 'nullable',
			'schema.*.conditions'                         => 'array',
			'schema.*.conditions.status'                  => 'required_with:schema|in:active,inactive',
			'schema.*.conditions.action'                  => 'required_if:schema.*.conditions.status,active|in:show,hide',
			'schema.*.conditions.match'                   => 'required_if:schema.*.conditions.status,active|in:ALL,ANY',
			'schema.*.conditions.rules'                   => 'required_if:schema.*.conditions.status,active|array',
			'schema.*.conditions.rules.*.target_field_id' => 'required_with:schema.*.conditions.rules',
			'schema.*.conditions.rules.*.operator'        => 'required_with:schema.*.conditions.rules|in:==,!=,>,<,>=,<=,contains,not_contains,empty,not_empty',
			'schema.*.conditions.rules.*.value'           => 'present',
			'schema.*.display_style'                      => 'nullable|in:swatch_only,swatch_label',
			'schema.*.enable_stock'                       => 'boolean',
			'schema.*.inventory_id'                       => 'required_if:schema.*.enable_stock,1',
			'schema.*.options.*.enable_stock'             => 'boolean',
			'schema.*.options.*.inventory_id'             => 'required_if:schema.*.options.*.enable_stock,1',
			'new_inventories'                             => 'array',
			'new_inventories.*.tmp_id'                    => 'required',
			'new_inventories.*.name'                      => 'required',
			'new_inventories.*.stock_count'               => 'numeric',
			'new_inventories.*.allow_backorders'          => 'boolean',
			'assignments'                                 => 'array',
			'assignments.*.target_type'                   => 'required|in:global,product,category,tag',
			'assignments.*.target_id'                     => 'required|numeric',
		);
	}

	/**
	 * Get the custom validation error messages.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_validation_messages() {
		return array(
			'required' => ':attribute ' . __( 'is required', 'optionbay-product-options-addons-woo' ),
			'min'      => ':attribute ' . __( 'minimum is :min', 'optionbay-product-options-addons-woo' ),
			'max'      => ':attribute ' . __( 'maximum is :max', 'optionbay-product-options-addons-woo' ),
			'numeric'  => ':attribute ' . __( 'must be a number', 'optionbay-product-options-addons-woo' ),
		);
	}

	/**
	 * Get the custom validation attribute aliases.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private function get_validation_aliases() {
		return array(
			'title'                     => __( 'Title', 'optionbay-product-options-addons-woo' ),
			'schema.*.label'            => __( 'Label', 'optionbay-product-options-addons-woo' ),
			'schema.*.type'             => __( 'Type', 'optionbay-product-options-addons-woo' ),
			'schema.*.options.*.label'  => __( 'Choice Label', 'optionbay-product-options-addons-woo' ),
			'assignments.*.target_type' => __( 'Assignment target', 'optionbay-product-options-addons-woo' ),
		);
	}

	/**
	 * Override parent validate to add custom validation rules (e.g. price > 0).
	 *
	 * @since 1.2.0
	 * @param WP_REST_Request $request  The incoming WP API request.
	 * @param array           $rules    The validation rules.
	 * @param array           $messages Optional custom error messages.
	 * @param array           $aliases  Optional custom attribute aliases.
	 * @return array|WP_Error
	 */
	protected function validate( WP_REST_Request $request, array $rules, array $messages = array(), array $aliases = array() ) {
		$validated = parent::validate( $request, $rules, $messages, $aliases );
		if ( is_wp_error( $validated ) ) {
			return $validated;
		}

		$errors = array();

		if ( isset( $validated['schema'] ) && is_array( $validated['schema'] ) ) {
			foreach ( $validated['schema'] as $f_idx => $field ) {
				$price_type = $field['price_type'] ?? 'none';
				$price      = floatval( $field['price'] ?? 0 );

				if ( in_array( $price_type, array( 'flat', 'percentage' ), true ) ) {
					if ( $price <= 0 ) {
						$errors[ "schema.{$f_idx}.price" ] = __( 'Price must be greater than 0 when a price type is selected.', 'optionbay-product-options-addons-woo' );
					}
				}

				$field_enable_stock = ! empty( $field['enable_stock'] );
				$options_have_stock = false;

				if ( isset( $field['options'] ) && is_array( $field['options'] ) ) {
					foreach ( $field['options'] as $o_idx => $option ) {
						if ( ! empty( $option['enable_stock'] ) ) {
							$options_have_stock = true;
						}

						$opt_price_type = $option['price_type'] ?? 'none';
						$opt_price      = floatval( $option['price'] ?? 0 );

						if ( in_array( $opt_price_type, array( 'flat' ), true ) ) {
							if ( $opt_price <= 0 ) {
								$errors[ "schema.{$f_idx}.options.{$o_idx}.price" ] = __( 'Price must be greater than 0 when a price type is selected.', 'optionbay-product-options-addons-woo' );
							}
						}
					}
				}

				if ( $options_have_stock && $field_enable_stock ) {
					$errors[ "schema.{$f_idx}.enable_stock" ] = __( 'Field stock tracking cannot be enabled when individual choice stock tracking is enabled.', 'optionbay-product-options-addons-woo' );
				}
			}
		}

		if ( ! empty( $errors ) ) {
			return new WP_Error(
				'validation_failed',
				__( 'Invalid data provided.', 'optionbay-product-options-addons-woo' ),
				array(
					'status' => 422,
					'errors' => $errors,
				)
			);
		}

		// Pro gating removed: all assignment targets (global, product, category, tag) are allowed.

		return $validated;
	}
}
