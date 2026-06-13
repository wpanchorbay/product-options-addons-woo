import { __ } from '@wordpress/i18n';
import {
	Type,
	AlignLeft,
	ChevronDown,
	SquareCheck,
	CircleDot,
	ToggleLeft,
	Hash,
	Upload,
	AtSign,
	Palette,
	ImagePlus,
	LucideIcon,
} from 'lucide-react';

export const FIELD_TYPE_ICONS: Record< string, LucideIcon > = {
	text: Type,
	textarea: AlignLeft,
	select: ChevronDown,
	checkbox: SquareCheck,
	radio: CircleDot,
	single_checkbox: ToggleLeft,
	number: Hash,
	file: Upload,
	email: AtSign,
	color_swatch: Palette,
	image_swatch: ImagePlus,
};

export const FIELD_TYPES = [
	{ value: 'text', label: __('Text Input', 'smart-product-options-addons') },
	{ value: 'textarea', label: __('Textarea', 'smart-product-options-addons') },
	{ value: 'select', label: __('Dropdown', 'smart-product-options-addons') },
	{ value: 'checkbox', label: __('Checkboxes', 'smart-product-options-addons') },
	{ value: 'radio', label: __('Radio Buttons', 'smart-product-options-addons') },
	{ value: 'single_checkbox', label: __('Checkbox', 'smart-product-options-addons') },
	{ value: 'number', label: __('Number', 'smart-product-options-addons') },
	{ value: 'file', label: __('File upload', 'smart-product-options-addons') },
	{ value: 'email', label: __('Email', 'smart-product-options-addons') },
	{ value: 'color_swatch', label: __('Color Swatch', 'smart-product-options-addons') },
	{ value: 'image_swatch', label: __('Image Swatch', 'smart-product-options-addons') },
	{ value: 'static_content', label: __('Static Content', 'smart-product-options-addons') },
];

export const PRICE_TYPES = [
	{ value: 'none', label: __( 'No Price', 'smart-product-options-addons' ) },
	{ value: 'flat', label: __( 'Flat Fee', 'smart-product-options-addons' ) },
	{ value: 'percentage', label: __( 'Percentage of Base', 'smart-product-options-addons' ) },
	{ value: 'character_count', label: __( 'Per Character', 'smart-product-options-addons' ) },
	{ value: 'formula', label: __( 'Formula', 'smart-product-options-addons' ) },
];

export const REDUCTION_MODES = [
	{ value: 'per_item_qty', label: __( 'Per Item Quantity', 'smart-product-options-addons' ) },
	{
		value: 'per_line_item',
		label: __( 'Per Line Item (Once)', 'smart-product-options-addons' ),
	},
	{ value: 'formula', label: __( 'Custom Formula', 'smart-product-options-addons' ) },
];
