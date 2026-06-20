<?php
/**
 * AddonGroup — Registers the ob_option_group Custom Post Type and its meta.
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

/**
 * Registers the ob_option_group Custom Post Type.
 *
 * Each Option Group stores a form schema (fields, pricing, conditions)
 * as JSON in post meta, and group-level display settings separately.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */
class AddonGroup extends Base {

	/**
	 * The Custom Post Type slug.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	const POST_TYPE = 'ob_option_group';

	/**
	 * Post meta key for the form schema JSON.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	const META_SCHEMA = '_ob_schema';

	/**
	 * Post meta key for group-level settings JSON.
	 *
	 * @since 1.0.0
	 * @var string
	 */
	const META_SETTINGS = '_ob_settings';

	/**
	 * Register the hooks for this component.
	 *
	 * @since 1.0.0
	 * @param Plugin $plugin The Plugin instance.
	 * @return void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'init', $this, 'register_post_type' );
		$loader->add_action( 'init', $this, 'register_meta' );
	}

	/**
	 * Register the ob_option_group Custom Post Type.
	 *
	 * Registers a hidden CPT that isn't publicly queryable or visible
	 * in the standard WordPress admin menu, because the React SPA manages it.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_post_type() {
		$labels = array(
			'name'               => _x( 'Option Groups', 'Post type general name', 'optionbay-product-options-addons-woo' ),
			'singular_name'      => _x( 'Option Group', 'Post type singular name', 'optionbay-product-options-addons-woo' ),
			'menu_name'          => _x( 'Option Groups', 'Admin Menu text', 'optionbay-product-options-addons-woo' ),
			'add_new'            => __( 'Add New', 'optionbay-product-options-addons-woo' ),
			'add_new_item'       => __( 'Add New Option Group', 'optionbay-product-options-addons-woo' ),
			'edit_item'          => __( 'Edit Option Group', 'optionbay-product-options-addons-woo' ),
			'new_item'           => __( 'New Option Group', 'optionbay-product-options-addons-woo' ),
			'view_item'          => __( 'View Option Group', 'optionbay-product-options-addons-woo' ),
			'search_items'       => __( 'Search Option Groups', 'optionbay-product-options-addons-woo' ),
			'not_found'          => __( 'No option groups found', 'optionbay-product-options-addons-woo' ),
			'not_found_in_trash' => __( 'No option groups found in Trash', 'optionbay-product-options-addons-woo' ),
		);

		$args = array(
			'labels'              => $labels,
			'public'              => false,
			'show_ui'             => false, // We manage UI via the React SPA
			'show_in_menu'        => false,
			'show_in_rest'        => false, // We use custom REST endpoints instead of WP REST API
			'exclude_from_search' => true,
			'publicly_queryable'  => false,
			'has_archive'         => false,
			'supports'            => array( 'title' ),
			'capability_type'     => 'post',
			'map_meta_cap'        => true,
		);

		register_post_type( self::POST_TYPE, $args );
		opopw_log( 'Registered Custom Post Type: ' . self::POST_TYPE, 'DEBUG' );
	}

	/**
	 * Register post meta for the schema and settings.
	 *
	 * @since 1.0.0
	 * @return void
	 */
	public function register_meta() {
		register_post_meta(
			self::POST_TYPE,
			self::META_SCHEMA,
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( $this, 'sanitize_json_meta' ),
			)
		);

		register_post_meta(
			self::POST_TYPE,
			self::META_SETTINGS,
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => array( $this, 'sanitize_json_meta' ),
			)
		);
	}

	/**
	 * Sanitize JSON meta values.
	 *
	 * Ensures the value being saved to the database is an array/object
	 * or valid JSON string. Returns empty JSON array on failure.
	 *
	 * @since 1.0.0
	 * @param string|array|object $value The raw meta value from REST API or direct save.
	 * @return string Sanitized JSON string.
	 */
	public function sanitize_json_meta( $value ) {
		if ( empty( $value ) ) {
			return '[]';
		}

		// If it's already an array/object (from internal WP functions), encode it
		if ( is_array( $value ) || is_object( $value ) ) {
			return wp_json_encode( $value );
		}

		// Attempt to decode the raw JSON string first (since it is unslashed)
		$decoded = json_decode( $value, true );

		// If direct decode failed, it might be double-slashed. Try unslashing it first.
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			$unslashed = wp_unslash( $value );
			$decoded   = json_decode( $unslashed, true );
		}

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			opopw_log( 'JSON validation failed in sanitize_json_meta', 'ERROR' );
			return '[]';
		}

		// Re-encode and save without extra slashing
		return wp_json_encode( $decoded );
	}

	/**
	 * Get the default schema for a new option group.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	public static function get_default_schema() {
		return array();
	}

	/**
	 * Get the default settings for a new option group.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	public static function get_default_settings() {
		return array(
			'layout'   => 'flat',    // flat | accordion
			'priority' => 10,
			'active'   => true,
		);
	}
}
