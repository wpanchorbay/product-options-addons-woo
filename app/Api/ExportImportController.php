<?php
/**
 * Export Import Controller — REST API handling for data migration.
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
use WP_Error;
use SmartProductOptionsAddons\Core\Exporter;
use SmartProductOptionsAddons\Core\Importer;

/**
 * Export Import Controller
 *
 * Serves export payload and processes import payload.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Api
 */
class ExportImportController extends ApiController {

	/**
	 * Instance of this class.
	 *
	 * @var ExportImportController
	 */
	protected static $instance = null;

	/**
	 * Get instance of this class.
	 *
	 * @return ExportImportController
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register the routes for the objects of the controller.
	 */
	public function register_routes() {
		$namespace = $this->namespace . '/' . $this->version;

		register_rest_route(
			$namespace,
			'/export',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'export_data' ),
					'permission_callback' => array( $this, 'permissions_check' ),
					'args'                => array(
						'entities' => array(
							'default'           => '',
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
			)
		);

		register_rest_route(
			$namespace,
			'/import',
			array(
				array(
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'import_data' ),
					'permission_callback' => array( $this, 'permissions_check' ),
				),
			)
		);
	}

	/**
	 * Check if a given request has access to import/export.
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return bool|WP_Error
	 */
	public function permissions_check( $request ) {
		return current_user_can( 'manage_woocommerce' ) || current_user_can( 'manage_options' );
	}

	/**
	 * Export selected entities to JSON.
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function export_data( $request ) {
		$entities_param = $request->get_param( 'entities' );
		$entities       = ! empty( $entities_param ) ? explode( ',', $entities_param ) : array();
		$payload        = array();

		if ( in_array( 'groups', $entities, true ) ) {
			$payload['groups'] = Exporter::export_groups();
		}
		if ( in_array( 'inventory', $entities, true ) ) {
			$payload['inventory'] = Exporter::export_inventory();
		}
		if ( in_array( 'settings', $entities, true ) ) {
			$payload['settings'] = Exporter::export_settings();
		}

		return rest_ensure_response( $payload );
	}

	/**
	 * Import entities from JSON payload.
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function import_data( $request ) {
		$params = $request->get_json_params();

		if ( empty( $params ) ) {
			return new WP_Error( 'invalid_payload', __( 'Invalid JSON payload.', 'optionbay-product-options-addons-woo' ), array( 'status' => 400 ) );
		}

		try {
			Importer::import_data( $params );
			return rest_ensure_response(
				array(
					'success' => true,
					'message' => __( 'Data imported successfully.', 'optionbay-product-options-addons-woo' ),
				)
			);
		} catch ( \Exception $e ) {
			return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
	}
}
