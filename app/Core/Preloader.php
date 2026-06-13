<?php
/**
 * Preloader — Automatically creates option groups from JSON templates.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */

namespace SmartProductOptionsAddons\Core;

use SmartProductOptionsAddons\Data\DbManager;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles preloading of demo option groups.
 *
 * @since 1.0.0
 */
class Preloader {

	/**
	 * Run the preloader logic.
	 *
	 * Checks if data has already been preloaded. If not, reads JSON files
	 * from assets/preloads/ and creates the corresponding option groups.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public static function run() {
		$settings = Settings::get_instance();

		// Check if already preloaded
		if ( $settings->get_settings( 'global_isPreloaded' ) ) {
			return;
		}

		smart_product_options_addons_log( 'Starting data preloading from JSON templates...', 'INFO' );

		$preload_file = SMART_PRODUCT_OPTIONS_ADDONS_PATH . 'assets/preloads/preloads.json';
		if ( ! file_exists( $preload_file ) ) {
			smart_product_options_addons_log( 'Preload file not found: ' . $preload_file, 'WARNING' );
			return;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$content = file_get_contents( $preload_file );
		if ( ! $content ) {
			smart_product_options_addons_log( 'Failed to read preload file.', 'ERROR' );
			return;
		}

		$groups = json_decode( $content, true );
		if ( ! is_array( $groups ) ) {
			smart_product_options_addons_log( 'Failed to decode JSON from preloads.json', 'ERROR' );
			return;
		}

		$created_count = 0;

		foreach ( $groups as $group_data ) {
			if ( empty( $group_data['title'] ) || empty( $group_data['schema'] ) ) {
				continue;
			}

			$post_id = wp_insert_post(
				array(
					'post_type'   => AddonGroup::POST_TYPE,
					'post_title'  => sanitize_text_field( $group_data['title'] ),
					'post_status' => 'draft',
				)
			);

			if ( is_wp_error( $post_id ) ) {
				smart_product_options_addons_log( 'Failed to create preloaded group: ' . $group_data['title'], 'ERROR' );
				continue;
			}

			// Save schema
			update_post_meta( $post_id, AddonGroup::META_SCHEMA, wp_slash( wp_json_encode( $group_data['schema'] ) ) );

			// Save default settings
			update_post_meta( $post_id, AddonGroup::META_SETTINGS, wp_json_encode( AddonGroup::get_default_settings() ) );

			// Assign globally by default
			DbManager::get_instance()->insert_assignments(
				$post_id,
				array(
					array(
						'target_type' => 'global',
						'target_id'   => 0,
						'priority'    => 10,
					),
				)
			);

			++$created_count;
		}

		// Mark as preloaded
		$settings->update_settings( array( 'global_isPreloaded' => true ) );

		smart_product_options_addons_log( "Successfully preloaded {$created_count} option groups.", 'INFO' );
	}
}
