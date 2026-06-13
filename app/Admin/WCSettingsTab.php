<?php
/**
 * WC Settings Tab — integrates Smart Product Options and Addons settings into WooCommerce settings.
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
 * WooCommerce Settings Tab for Smart Product Options and Addons.
 */
class WCSettingsTab extends \WC_Settings_Page {

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->id    = 'smart-product-options-addons';
		$this->label = __( 'Options', 'smart-product-options-addons' );

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
