<?php
/**
 * Field Factory — Orchestrates the instantiation of concrete field type classes.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Fields
 */

namespace Opopw\Fields;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Field Factory — maps JSON field type to a PHP class instance.
 *
 * Extensible via the `opopw_register_field_types` filter.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Fields
 */
class FieldFactory {

	/**
	 * Registry of field type => class name.
	 *
	 * @since 1.0.0
	 * @var array
	 */
	private static $types = null;

	/**
	 * Get the registered field type classes.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	private static function get_types() {
		if ( null === self::$types ) {
			self::$types = array(
				'text'            => TextField::class,
				'textarea'        => TextareaField::class,
				'select'          => SelectField::class,
				'checkbox'        => CheckboxField::class,
				'single_checkbox' => CheckboxField::class,
				'radio'           => RadioField::class,
				'email'           => EmailField::class,
				'number'          => NumberField::class,
				'date'            => DateField::class,
				'time'            => TimeField::class,
				'datetime'        => DateTimeField::class,
				'color_swatch'    => ColorSwatchField::class,
				'image_swatch'    => ImageSwatchField::class,
				'static_content'  => StaticContentField::class,
			);

			/**
			 * Filter the registered field types.
			 *
			 * Allows third-party plugins to add custom field types.
			 *
			 * @since 1.0.0
			 * @param array $types Associative array of type => class name.
			 */
			self::$types = apply_filters( 'opopw_register_field_types', self::$types );
		}
		return self::$types;
	}

	/**
	 * Create a field instance from a schema definition.
	 *
	 * Matches the string type identifier in the JSON schema map to a
	 * backend class and returns a newly instantiated concrete object.
	 *
	 * @since 1.0.0
	 * @param int   $group_id The Option Group post ID.
	 * @param array $schema   The field definition from JSON.
	 * @return InterfaceField|null Field instance, or null if type unknown.
	 */
	public static function create( int $group_id, array $schema ) {
		$type  = $schema['type'] ?? '';
		$types = self::get_types();

		if ( ! isset( $types[ $type ] ) ) {
			opopw_log( "FieldFactory: Unregistered field type requested: '{$type}' in group {$group_id}", 'WARNING' );
			return null;
		}

		$class = $types[ $type ];
		if ( ! class_exists( $class ) ) {
			opopw_log( "FieldFactory: Class '{$class}' for type '{$type}' does not exist.", 'ERROR' );
			return null;
		}

		return new $class( $group_id, $schema );
	}

	/**
	 * Check if a field type is registered.
	 *
	 * @since 1.0.0
	 * @param string $type The field type slug.
	 * @return bool
	 */
	public static function is_registered( string $type ) {
		$types = self::get_types();
		return isset( $types[ $type ] );
	}
}
