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
	Link2,
	Phone,
	Minus,
	Heading,
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
	url: Link2,
	tel: Phone,
	divider: Minus,
	heading: Heading,
};

/**
 * A field/price type entry. `variant: 'buy_pro'` marks it as a locked upsell
 * teaser (rendered disabled with a gold lock) when Pro is not active.
 */
export interface TypeOption {
	value: string;
	label: string;
	variant?: 'buy_pro';
	/**
	 * Whether this price type may be selected on an INDIVIDUAL OPTION of a
	 * choice field, as opposed to on the field itself.
	 *
	 * Opt-in by design. A strategy that omits the flag is absent from the
	 * per-option dropdown rather than present and silently pricing at 0 —
	 * failing toward absence. `character_count` and `word_count` are excluded
	 * deliberately: an option value is an admin-authored slug, so counting its
	 * characters or words charges by something the customer never typed.
	 */
	optionCapable?: boolean;
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
	{ value: 'url', label: __('URL', 'optionbay-product-options-addons-woo') },
	{ value: 'tel', label: __('Telephone', 'optionbay-product-options-addons-woo') },
	{ value: 'divider', label: __('Separator', 'optionbay-product-options-addons-woo') },
	{ value: 'heading', label: __('Heading', 'optionbay-product-options-addons-woo') },
] ) as TypeOption[];

/**
 * Field types that render presentation only and submit no value.
 *
 * Mirrors PHP's `opopw_get_presentational_field_types()`. Single source for
 * every builder branch that needs to hide pricing, stock, validation or
 * conditional-trigger settings — these were previously seven separate
 * hand-maintained `=== 'static_content'` checks.
 */
export const PRESENTATIONAL_TYPES: string[] = [ 'static_content', 'divider', 'heading' ];

/** Whether a field type renders presentation only. */
export const isPresentational = ( type?: string ): boolean =>
	!! type && PRESENTATIONAL_TYPES.includes( type );

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
	{ value: 'none', label: __( 'No Price', 'optionbay-product-options-addons-woo' ), optionCapable: true },
	{ value: 'flat', label: __( 'Flat Fee', 'optionbay-product-options-addons-woo' ), optionCapable: true },
	{ value: 'percentage', label: __( 'Percentage of Base', 'optionbay-product-options-addons-woo' ), optionCapable: true },
] ) as TypeOption[];

// Same pattern as FIELD_TYPES: locked teasers only when Pro is inactive.
if ( ! isProActive() ) {
	PRICE_TYPES_BASE.push(
		{ value: 'formula', label: __( 'Formula-based Pricing', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro', optionCapable: true },
		{ value: 'character_count', label: __( 'Price per Character', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro' },
		{ value: 'word_count', label: __( 'Price per Word', 'optionbay-product-options-addons-woo' ), variant: 'buy_pro' }
	);
}

export const PRICE_TYPES: TypeOption[] = PRICE_TYPES_BASE;

/**
 * Price types selectable on an individual option of a choice field.
 *
 * See TypeOption.optionCapable for why this is an opt-in allow-list.
 */
export const OPTION_PRICE_TYPES: TypeOption[] = PRICE_TYPES_BASE.filter(
	( pt ) => pt.optionCapable === true
);

export const REDUCTION_MODES = [
	{ value: 'per_item_qty', label: __( 'Per Item Quantity', 'optionbay-product-options-addons-woo' ) },
	{
		value: 'per_line_item',
		label: __( 'Per Line Item (Once)', 'optionbay-product-options-addons-woo' ),
	},
];
