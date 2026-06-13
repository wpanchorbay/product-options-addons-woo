<?php
/**
 * Core Configuration
 *
 * Use this file to register your Core classes that need to be initialized.
 * Each class should implement a run($loader) method or similar logic
 * to register its hooks with the Loader.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

return array(
	\SmartProductOptionsAddons\Admin\Admin::class,
	\SmartProductOptionsAddons\Core\Settings::class,
	\SmartProductOptionsAddons\Core\Cron::class,
	\SmartProductOptionsAddons\Core\AddonGroup::class,
	\SmartProductOptionsAddons\Core\AddonRenderer::class,
	\SmartProductOptionsAddons\Core\CartManager::class,
);
