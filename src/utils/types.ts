/**
 * Type definitions for the Smart Product Options and Addons plugin.
 *
 * Customize these types for your own plugin's data structures.
 */

export interface PluginData {
	plugin_name: string;
	short_name: string;
	menu_label: string;
	custom_icon: string;
	menu_icon: string;
	author_name: string;
	author_uri: string;
	support_uri: string;
	docs_uri: string;
	position: number;
}

export interface WpSettings {
	dateFormat: string;
	timeFormat: string;
}

/**
 * Shared option type for dropdowns and selects.
 */
export interface SelectOption {
	value: string | number;
	label: string;
	/**
	 * Optional custom classes for this specific option.
	 * Useful for multi-color dropdowns (e.g., badges, status colors).
	 */
	className?: string;
	disabled?: boolean;
	/**
	 * Special variants for the option.
	 * 'buy_pro' will disable the option and show a tooltip.
	 */
	variant?: 'buy_pro' | 'coming_soon';
}

/**
 * Shared option type for multi-select components.
 */
export interface MultiSelectOption {
	value: string | number;
	label: string;
	className?: string;
	disabled?: boolean;
	variant?: 'buy_pro' | 'coming_soon';
}

/**
 * Plugin settings as stored in the WordPress option.
 * Must match the PHP default settings in Common.php.
 */
export interface PluginSettings {
	global_enableFeature: boolean;
	global_exampleText: string;
	advanced_deleteAllOnUninstall: boolean;
	debug_enableMode: boolean;
}

/**
 * The main store type, matching the data passed by PHP's wp_localize_script().
 */
export interface PluginStore {
	version: string;
	root_id: string;
	nonce: string;
	store: string;
	rest_url: string;
	pluginData: PluginData;
	wpSettings: WpSettings;
	plugin_settings: PluginSettings;
}
