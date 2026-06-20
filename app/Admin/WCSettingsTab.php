<?php
/**
 * WC Settings Tab — integrates OptionBay - Product Options and Addons settings into WooCommerce settings.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Admin
 */

namespace SmartProductOptionsAddons\Admin;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * WooCommerce Settings Tab for OptionBay - Product Options and Addons.
 */
class WCSettingsTab extends \WC_Settings_Page {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->id    = 'optionbay-product-options-addons-woo';
		$this->label = __( 'Options', 'optionbay-product-options-addons-woo' );

		parent::__construct();
	}

	/**
	 * Output the settings.
	 */
	public function output() {
		Admin::get_instance()->add_setting_root_div();
	}

	/**
	 * Save settings.
	 *
	 * We don't need this because React handles saving via REST API.
	 */
	public function save() {
		// Logic is handled by React/REST API.
	}
}
