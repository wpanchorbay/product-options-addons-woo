<?php
/**
 * Preloader — Automatically creates option groups from JSON templates.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Core
 */

namespace Opopw\Core;

use Opopw\Data\DbManager;

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
	 * Post meta key that stamps a post as created from a preload template.
	 *
	 * @since 1.0.3
	 */
	const META_PRELOADED_KEY = '_opopw_preloaded_key';

	/**
	 * Check whether a preloaded group for the given template key already exists.
	 *
	 * Looks at every status, including trash, so a trashed demo group is not recreated.
	 *
	 * @since 1.0.3
	 * @param string $key Template key.
	 * @return bool
	 */
	private static function group_exists( $key ) {
		$ids = get_posts(
			array(
				'post_type'      => AddonGroup::POST_TYPE,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future', 'trash' ),
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_key'       => self::META_PRELOADED_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			)
		);
		return ! empty( $ids );
	}

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

		opopw_log( 'Starting data preloading from JSON templates...', 'INFO' );

		$preload_file = OPOPW_PATH . 'assets/preloads/preloads.json';
		if ( ! file_exists( $preload_file ) ) {
			opopw_log( 'Preload file not found: ' . $preload_file, 'WARNING' );
			return;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$content = file_get_contents( $preload_file );
		if ( ! $content ) {
			opopw_log( 'Failed to read preload file.', 'ERROR' );
			return;
		}

		$groups = json_decode( $content, true );
		if ( ! is_array( $groups ) ) {
			opopw_log( 'Failed to decode JSON from preloads.json', 'ERROR' );
			return;
		}

		$created_count = 0;

		foreach ( $groups as $group_data ) {
			if ( empty( $group_data['title'] ) || empty( $group_data['schema'] ) ) {
				continue;
			}

			$template_key = sanitize_title( $group_data['title'] );
			if ( self::group_exists( $template_key ) ) {
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
				opopw_log( 'Failed to create preloaded group: ' . $group_data['title'], 'ERROR' );
				continue;
			}

			// Stamp the post so later runs can detect it.
			update_post_meta( $post_id, self::META_PRELOADED_KEY, $template_key );

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

		opopw_log( "Successfully preloaded {$created_count} option groups.", 'INFO' );
	}
}
