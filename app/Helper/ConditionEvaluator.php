<?php
/**
 * Condition Evaluator — processes conditional logic rules for fields.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Helper
 */

namespace SmartProductOptionsAddons\Helper;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Condition Evaluator
 *
 * Server-side evaluation of conditional logic rules to ensure accurate
 * validation and pricing when processing add-to-cart requests.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Helper
 */
class ConditionEvaluator {

	/**
	 * Evaluate if a field should be visible (and thus processed/validated)
	 * based on its conditions and the submitted form data.
	 *
	 * This engine processes an array of rules configured in the admin SPA,
	 * matching them either by ALL (AND logic) or ANY (OR logic), and returning
	 * a boolean indicating if the field is active for the current cart addition.
	 *
	 * @since 1.0.0
	 * @param array $field_schema   The schema of the field being evaluated.
	 * @param array $submitted_data The data submitted for this group ($_POST['smart_product_options_addons_addons'][$group_id]).
	 * @return bool True if visible, false if hidden.
	 */
	public static function is_visible( array $field_schema, array $submitted_data ) {
		$conditions = $field_schema['conditions'] ?? array();

		// If conditions are not active, it's always visible by default
		if ( empty( $conditions['status'] ) || 'active' !== $conditions['status'] ) {
			return true;
		}

		$rules = $conditions['rules'] ?? array();
		if ( empty( $rules ) ) {
			// If active but no rules, default to visible if action is hide, hidden if action is show
			return 'hide' === ( $conditions['action'] ?? 'show' );
		}

		smart_product_options_addons_log( 'Evaluating conditions for field: ' . ( $field_schema['id'] ?? 'unknown' ), 'DEBUG' );

		$results = array();
		// Map over all rules and assess each one individually
		foreach ( $rules as $rule ) {
			$rule_result = self::evaluate_rule( $rule, $submitted_data );
			$results[]   = $rule_result;
		}

		$match         = $conditions['match'] ?? 'ALL';
		$condition_met = false;

		// Combine results based on Match Type
		if ( 'ALL' === $match ) {
			$condition_met = ! in_array( false, $results, true );
		} else { // ANY
			$condition_met = in_array( true, $results, true );
		}

		$action = $conditions['action'] ?? 'show';

		// Determine final visibility based on action
		if ( 'show' === $action ) {
			$is_visible = $condition_met;
		} else { // hide
			$is_visible = ! $condition_met;
		}

		smart_product_options_addons_log( "Condition result for field {$field_schema['id']}: Match met? " . ( $condition_met ? 'Yes' : 'No' ) . '. Visible? ' . ( $is_visible ? 'Yes' : 'No' ), 'DEBUG' );

		return $is_visible;
	}

	/**
	 * Evaluate a single rule against the submitted data.
	 *
	 * Runs the chosen operator (==, !=, >, <, contains, etc) against the dynamic user
	 * submitted target value and the static rule value.
	 *
	 * @since 1.0.0
	 * @param array $rule The rule definition containing target_field_id, operator, and value.
	 * @param array $submitted_data All previously processed user inputs for this group.
	 * @return bool True if the specific rule condition is satisfied.
	 */
	private static function evaluate_rule( array $rule, array $submitted_data ) {
		$target_id = $rule['target_field_id'] ?? '';
		if ( empty( $target_id ) ) {
			return false;
		}

		$target_value = $submitted_data[ $target_id ] ?? '';
		$rule_value   = $rule['value'] ?? '';
		$op           = $rule['operator'] ?? '==';

		// Handle array values (e.g. multi-checkbox)
		if ( is_array( $target_value ) ) {
			switch ( $op ) {
				case '==':
					return in_array( $rule_value, $target_value, true );
				case '!=':
					return ! in_array( $rule_value, $target_value, true );
				case 'contains':
					return in_array( $rule_value, $target_value, true );
				case 'not_contains':
					return ! in_array( $rule_value, $target_value, true );
				case 'empty':
					return empty( $target_value );
				case 'not_empty':
					return ! empty( $target_value );
				default:
					return false;
			}
		}

		// String/number comparison
		$target_value = (string) $target_value;
		$rule_value   = (string) $rule_value;

		switch ( $op ) {
			case '==':
				return $target_value === $rule_value;
			case '!=':
				return $target_value !== $rule_value;
			case '>':
				return floatval( $target_value ) > floatval( $rule_value );
			case '<':
				return floatval( $target_value ) < floatval( $rule_value );
			case '>=':
				return floatval( $target_value ) >= floatval( $rule_value );
			case '<=':
				return floatval( $target_value ) <= floatval( $rule_value );
			case 'contains':
				return strpos( $target_value, $rule_value ) !== false;
			case 'not_contains':
				return strpos( $target_value, $rule_value ) === false;
			case 'empty':
				return '' === $target_value;
			case 'not_empty':
				return '' !== $target_value;
			default:
				return false;
		}
	}
}
