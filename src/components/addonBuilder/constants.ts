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
	Calendar,
	Clock,
	CalendarClock,
	Upload,
	Sigma,
	LucideIcon,
} from 'lucide-react';
import { applyFilters } from '@wordpress/hooks';
import { isProActive } from '../../utils/pro';

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
	date: Calendar,
	time: Clock,
	datetime: CalendarClock,
	file: Upload,
	formula: Sigma,
};

/**
 * A field/price type entry. `variant: 'buy_pro'` marks it as a locked upsell
 * teaser (rendered disabled with a gold lock) when Pro is not active.
 */
export interface TypeOption {
	value: string;
	label: string;
	variant?: 'buy_pro';
}

const FIELD_TYPES_BASE = applyFilters( 'opopw_field_types', [
	{ value: 'text', label: __('Text Input', 'optionbay-product-options-addons-woo') },
	{ value: 'textarea', label: __('Textarea', 'optionbay-product-options-addons-woo') },
	{ value: 'select', label: __('Dropdown', 'optionbay-product-options-addons-woo') },
	{ value: 'checkbox', label: __('Checkboxes', 'optionbay-product-options-addons-woo') },
	{ value: 'radio', label: __('Radio Buttons', 'optionbay-product-options-addons-woo') },
	{ value: 'single_checkbox', label: __('Checkbox', 'optionbay-product-options-addons-woo') },
	{ value: 'number', label: __('Number', 'optionbay-product-options-addons-woo') },
	{ value: 'email', label: __('Email', 'optionbay-product-options-addons-woo') },
	{ value: 'date', label: __('Date Picker', 'optionbay-product-options-addons-woo') },
	{ value: 'time', label: __('Time Picker', 'optionbay-product-options-addons-woo') },
	{ value: 'datetime', label: __('Date & Time', 'optionbay-product-options-addons-woo') },
	{ value: 'color_swatch', label: __('Color Swatch', 'optionbay-product-options-addons-woo') },
	{ value: 'image_swatch', label: __('Image Swatch', 'optionbay-product-options-addons-woo') },
	{ value: 'static_content', label: __('Static Content', 'optionbay-product-options-addons-woo') },
] ) as TypeOption[];

// When Pro is inactive, surface Pro-only field types as locked upsell teasers.
// When Pro is active, Pro's `opopw_field_types` filter supplies the real ones,
// so we skip these to avoid duplicates.
if ( ! isProActive() ) {
	FIELD_TYPES_BASE.push(
		{ value: 'file', label: __( 'File Upload', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro' },
		{ value: 'formula', label: __( 'Formula', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro' }
	);
}

export const FIELD_TYPES: TypeOption[] = FIELD_TYPES_BASE;

const PRICE_TYPES_BASE = applyFilters( 'opopw_price_types', [
	{ value: 'none', label: __( 'No Price', 'optionbay-product-options-addons-woo' ) },
	{ value: 'flat', label: __( 'Flat Fee', 'optionbay-product-options-addons-woo' ) },
	{ value: 'percentage', label: __( 'Percentage of Base', 'optionbay-product-options-addons-woo' ) },
] ) as TypeOption[];

// Same pattern as FIELD_TYPES: locked teasers only when Pro is inactive.
if ( ! isProActive() ) {
	PRICE_TYPES_BASE.push(
		{ value: 'formula', label: __( 'Formula-based Pricing', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro' },
		{ value: 'character_count', label: __( 'Price per Character', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro' }
	);
}

export const PRICE_TYPES: TypeOption[] = PRICE_TYPES_BASE;

export const REDUCTION_MODES = [
	{ value: 'per_item_qty', label: __( 'Per Item Quantity', 'optionbay-product-options-addons-woo' ) },
	{
		value: 'per_line_item',
		label: __( 'Per Line Item (Once)', 'optionbay-product-options-addons-woo' ),
	},
];
