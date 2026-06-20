import { __ } from '@wordpress/i18n';

/**
 * Centralized tooltips for the Addon Builder field settings.
 * All help text strings are internationalized using __().
 */
export const FIELD_TOOLTIPS = {
	label: __(
		'The name of the field shown to the customer on the product page.',
		'optionbay-product-options-addons-woo'
	),
	id: __(
		'A unique identifier for this field, used for internal tracking and conditional logic.',
		'optionbay-product-options-addons-woo'
	),
	type: __(
		'The input method used to collect data from customers.',
		'optionbay-product-options-addons-woo'
	),
	description: __(
		'Additional instruction text displayed below the field input on the product page.',
		'optionbay-product-options-addons-woo'
	),
	placeholder: __(
		"A short hint displayed inside the input when it is empty.",
		'optionbay-product-options-addons-woo'
	),
	required: __(
		'Whether this field must be completed before the product can be added to the cart.',
		'optionbay-product-options-addons-woo'
	),
	class_name: __(
		'Custom CSS class for advanced styling of the field container.',
		'optionbay-product-options-addons-woo'
	),
	price_type: __(
		'The calculation method used to determine the price impact of this field.',
		'optionbay-product-options-addons-woo'
	),
	price: __(
		'The monetary value added to or subtracted from the product price.',
		'optionbay-product-options-addons-woo'
	),
	weight: __(
		'The weight adjustment for this field, used in shipping calculations.',
		'optionbay-product-options-addons-woo'
	),
	restrictions: __(
		'Validation rules such as character limits or numeric ranges.',
		'optionbay-product-options-addons-woo'
	),
	file_restrictions: __(
		'Allowed file extensions and maximum file size for uploads.',
		'optionbay-product-options-addons-woo'
	),
	choices: __(
		'The list of selectable options available for this field.',
		'optionbay-product-options-addons-woo'
	),
	conditional_logic: __(
		'Rules that determine when this field is shown or hidden based on other field values.',
		'optionbay-product-options-addons-woo'
	),
};
