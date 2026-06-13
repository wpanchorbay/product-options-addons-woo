<?php

namespace SmartProductOptionsAddons\Helper;

// Exit if accessed directly.
if (!defined('ABSPATH')) {
	exit;
}

/**
 * WooCommerce Helper Class
 *
 * Encapsulates direct calls to WooCommerce functions to ensure compatibility and safe usage.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Helper
 */
class WooCommerce
{
	/**
	 * Get product category IDs.
	 *
	 * @since 1.0.0
	 * @param int $product_id
	 * @return array
	 */
	public static function get_product_cat_ids($product_id)
	{
		if (function_exists('wc_get_product_cat_ids')) {
			return wc_get_product_cat_ids($product_id);
		}
		return array();
	}

	/**
	 * Get product tag IDs.
	 *
	 * @since 1.0.0
	 * @param int $product_id
	 * @return array
	 */
	public static function get_product_tag_ids($product_id)
	{
		if (function_exists('wc_get_product_term_ids')) {
			return wc_get_product_term_ids($product_id, 'product_tag');
		}
		return array();
	}

	/**
	 * Get the currency symbol.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function get_currency_symbol()
	{
		if (function_exists('get_woocommerce_currency_symbol')) {
			return get_woocommerce_currency_symbol();
		}
		return '$';
	}

	/**
	 * Get the number of decimals configured in WooCommerce.
	 *
	 * @since 1.0.0
	 * @return int
	 */
	public static function get_price_decimals()
	{
		if (function_exists('wc_get_price_decimals')) {
			return wc_get_price_decimals();
		}
		return 2;
	}

	/**
	 * Get the thousands separator configured in WooCommerce.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function get_price_thousand_separator()
	{
		if (function_exists('wc_get_price_thousand_separator')) {
			return wc_get_price_thousand_separator();
		}
		return ',';
	}

	/**
	 * Get the decimal separator configured in WooCommerce.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function get_price_decimal_separator()
	{
		if (function_exists('wc_get_price_decimal_separator')) {
			return wc_get_price_decimal_separator();
		}
		return '.';
	}

	/**
	 * Get the price format defined in WooCommerce.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function get_price_format()
	{
		if (function_exists('get_woocommerce_price_format')) {
			return get_woocommerce_price_format();
		}
		return '%1$s%2$s';
	}

	/**
	 * Check if currently on a single product page.
	 *
	 * @since 1.0.0
	 * @return bool
	 */
	public static function is_product()
	{
		if (function_exists('is_product')) {
			return is_product();
		}
		return false;
	}
}
