import { __ } from '@wordpress/i18n';
import {
	Type,
	AlignLeft,
	ChevronDown,
	SquareCheck,
	CircleDot,
	ToggleLeft,
	Hash,
	AtSign,
	Palette,
	ImagePlus,
	LucideIcon,
} from 'lucide-react';

// Removed proFeatures logic

export const FIELD_TYPE_ICONS: Record< string, LucideIcon > = {
	text: Type,
	textarea: AlignLeft,
	select: ChevronDown,
	checkbox: SquareCheck,
	radio: CircleDot,
	single_checkbox: ToggleLeft,
	number: Hash,
	email: AtSign,
	color_swatch: Palette,
	image_swatch: ImagePlus,
};

export const FIELD_TYPES = [
	{ value: 'text', label: __('Text Input', 'optionbay-product-options-addons-woo') },
	{ value: 'textarea', label: __('Textarea', 'optionbay-product-options-addons-woo') },
	{ value: 'select', label: __('Dropdown', 'optionbay-product-options-addons-woo') },
	{ value: 'checkbox', label: __('Checkboxes', 'optionbay-product-options-addons-woo') },
	{ value: 'radio', label: __('Radio Buttons', 'optionbay-product-options-addons-woo') },
	{ value: 'single_checkbox', label: __('Checkbox', 'optionbay-product-options-addons-woo') },
	{ value: 'number', label: __('Number', 'optionbay-product-options-addons-woo') },
	{ value: 'email', label: __('Email', 'optionbay-product-options-addons-woo') },
	{ value: 'color_swatch', label: __('Color Swatch', 'optionbay-product-options-addons-woo') },
	{ value: 'image_swatch', label: __('Image Swatch', 'optionbay-product-options-addons-woo') },
	{ value: 'static_content', label: __('Static Content', 'optionbay-product-options-addons-woo') },
];

export const PRICE_TYPES = [
	{ value: 'none', label: __( 'No Price', 'optionbay-product-options-addons-woo' ) },
	{ value: 'flat', label: __( 'Flat Fee', 'optionbay-product-options-addons-woo' ) },
	{ value: 'percentage', label: __( 'Percentage of Base', 'optionbay-product-options-addons-woo' ) },
];

export const REDUCTION_MODES = [
	{ value: 'per_item_qty', label: __( 'Per Item Quantity', 'optionbay-product-options-addons-woo' ) },
	{
		value: 'per_line_item',
		label: __( 'Per Line Item (Once)', 'optionbay-product-options-addons-woo' ),
	},
];
