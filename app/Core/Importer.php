<?php
/**
 * Importer — Service for processing imported JSON data.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */

namespace SmartProductOptionsAddons\Core;

use SmartProductOptionsAddons\Data\DbManager;
use SmartProductOptionsAddons\Data\InventoryManager;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Importer class.
 *
 * Handles importing and parsing serialized JSON database exports into option groups, settings, and inventory.
 *
 * @since 1.0.0
 */
class Importer {
	/**
	 * Import plugin data payload.
	 *
	 * Parses and registers option groups, inventory items, and general settings from payload array.
	 *
	 * @since 1.0.0
	 * @param array $payload The exported data structure.
	 * @return bool True on success.
	 */
	public static function import_data( $payload ) {
		$id_map = array(); // old_id => new_id

		// 1. Import Inventory first so we can remap IDs in groups
		if ( ! empty( $payload['inventory'] ) && is_array( $payload['inventory'] ) ) {
			foreach ( $payload['inventory'] as $inv ) {
				$old_id = $inv['id'] ?? null;
				if ( ! empty( $inv['name'] ) ) {
					$new_id = InventoryManager::get_instance()->create_item(
						array(
							'name'             => $inv['name'],
							'stock_count'      => isset( $inv['stock_count'] ) ? $inv['stock_count'] : 0,
							'allow_backorders' => ! empty( $inv['allow_backorders'] ) ? true : false,
						)
					);
					if ( $new_id && $old_id ) {
						$id_map[ $old_id ] = $new_id;
					}
				}
			}
		}

		// 2. Import Groups
		if ( ! empty( $payload['groups'] ) && is_array( $payload['groups'] ) ) {
			foreach ( $payload['groups'] as $group ) {
				$schema = isset( $group['schema'] ) && is_array( $group['schema'] ) ? $group['schema'] : array();

				// Remap inventory IDs in schema
				if ( ! empty( $id_map ) ) {
					foreach ( $schema as &$field ) {
						if ( ! empty( $field['inventory_id'] ) && isset( $id_map[ $field['inventory_id'] ] ) ) {
							$field['inventory_id'] = $id_map[ $field['inventory_id'] ];
						}
						if ( ! empty( $field['options'] ) && is_array( $field['options'] ) ) {
							foreach ( $field['options'] as &$option ) {
								if ( ! empty( $option['inventory_id'] ) && isset( $id_map[ $option['inventory_id'] ] ) ) {
									$option['inventory_id'] = $id_map[ $option['inventory_id'] ];
								}
							}
						}
					}
					unset( $field, $option );
				}

				$post_id = wp_insert_post(
					array(
						'post_type'   => AddonGroup::POST_TYPE,
						'post_title'  => isset( $group['title'] ) ? sanitize_text_field( $group['title'] ) : 'Imported Group',
						'post_status' => isset( $group['status'] ) ? sanitize_text_field( $group['status'] ) : 'draft',
					),
					true
				);

				if ( ! is_wp_error( $post_id ) ) {
					update_post_meta( $post_id, AddonGroup::META_SCHEMA, wp_slash( wp_json_encode( $schema ) ) );

					// Only import global assignments to avoid breaking target site relations
					if ( ! empty( $group['assignments'] ) && is_array( $group['assignments'] ) ) {
						$global_assignments = array_filter(
							$group['assignments'],
							function ( $a ) {
								return isset( $a['target_type'] ) && 'global' === $a['target_type'];
							}
						);
						if ( ! empty( $global_assignments ) ) {
							DbManager::get_instance()->sync_assignments( $post_id, $global_assignments );
						}
					}
				}
			}
		}

		// 3. Import Settings
		if ( ! empty( $payload['settings'] ) && is_array( $payload['settings'] ) ) {
			foreach ( $payload['settings'] as $key => $val ) {
				Settings::get_instance()->update_settings( $key, $val );
			}
		}

		return true;
	}
}
