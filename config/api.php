<?php
/**
 * API Configuration
 *
 * Use this file to register your API controllers.
 * Each controller must extend SmartProductOptionsAddons\Api\ApiController
 * and implement get_instance() and run().
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

return array(
	\SmartProductOptionsAddons\Api\SettingsController::class,
	\SmartProductOptionsAddons\Api\AddonGroupController::class,
	\SmartProductOptionsAddons\Api\ResourceController::class,
	\SmartProductOptionsAddons\Api\InventoryController::class,
	\SmartProductOptionsAddons\Api\ExportImportController::class,
);
