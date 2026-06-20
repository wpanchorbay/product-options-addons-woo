import React, { useState, useEffect } from 'react';
import {
	ClassicSettingsTable,
	ClassicInput,
	ClassicSelect,
	ClassicCheckbox,
	ClassicButton,
} from '../components/classics';
import { useToast } from '../store/toast/use-toast';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { SkeletonSettings } from '../components/loading/SkeletonSettings';
import { TopProgressBar } from '../components/loading/TopProgressBar';

interface SettingsData {
	global_optionsOrientation: 'vertical' | 'horizontal';
	global_fontSizeLabel: string;
	global_fontSizeInput: string;
	global_swatchSize: string;
	global_swatchImageSize: string;
	global_swatchRadius: string;
	global_swatchImageRadius: string;
	advanced_deleteAllOnUninstall: boolean;
	debug_enableMode: boolean;
}

const Settings: React.FC = () => {
	const [settings, setSettings] = useState<SettingsData | null>(null);
	const [originalSettings, setOriginalSettings] =
		useState<SettingsData | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const { addToast } = useToast();

	useEffect(() => {
		fetchSettings();
	}, []);

	// Hijack the native WooCommerce save button
	useEffect(() => {
		const form = document.getElementById('mainform') as HTMLFormElement;
		if (!form) {
			return;
		}

		const onFormSubmit = (e: Event) => {
			e.preventDefault();
			// Only trigger if we have changes or if we want to allow "force save"
			handleSave();
		};

		form.addEventListener('submit', onFormSubmit);
		return () => form.removeEventListener('submit', onFormSubmit);
	}, [settings, originalSettings]); // Re-attach when state changes to capture fresh values in closure

	const fetchSettings = async () => {
		try {
			const response: any = await apiFetch({
				path: 'optionbay-product-options-addons-woo/v1/settings',
			});
			if (response.success) {
				setSettings(response.data);
				setOriginalSettings(response.data);
			}
		} catch (error) {
			console.error('Error fetching settings:', error);
			addToast(__('Failed to load settings.', 'optionbay-product-options-addons-woo'), 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		if (!settings) {
			return;
		}
		setIsSaving(true);
		try {
			const response: any = await apiFetch({
				path: 'optionbay-product-options-addons-woo/v1/settings',
				method: 'POST',
				data: settings,
			});
			if (response.success) {
				setSettings(response.data);
				setOriginalSettings(response.data);
				addToast(
					__('Settings saved successfully.', 'optionbay-product-options-addons-woo'),
					'success'
				);

				// Prevent WooCommerce "Unsaved Changes" dialog
				const nativeSaveButton = document.querySelector(
					'button[name="save"]'
				);
				if (nativeSaveButton) {
					(nativeSaveButton as HTMLButtonElement).disabled = true;
				}
				window.onbeforeunload = null;
			}
		} catch (error) {
			console.error('Error saving settings:', error);
			addToast(__('Failed to save settings.', 'optionbay-product-options-addons-woo'), 'error');
		} finally {
			setIsSaving(false);
			// Remove "is-busy" class from native WooCommerce button
			const nativeSaveButton = document.querySelector(
				'button[name="save"]'
			);
			if (nativeSaveButton) {
				nativeSaveButton.classList.remove('is-busy');
			}
		}
	};

	const hasChanges =
		JSON.stringify(settings) !== JSON.stringify(originalSettings);

	// Synchronize the native WooCommerce save button state
	useEffect(() => {
		const nativeSaveButton = document.querySelector(
			'button[name="save"]'
		);
		if (nativeSaveButton) {
			(nativeSaveButton as HTMLButtonElement).disabled = !hasChanges;
		}
	}, [hasChanges]);

	if (isLoading) {
		return (
			<div className="wpab-wpoa-p-page-default">
				<SkeletonSettings />
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="wpab-wpoa-p-page-default">
				<p>{__('Failed to load settings.', 'optionbay-product-options-addons-woo')}</p>
			</div>
		);
	}

	return (
		<div className="wpab-wpoa-p-page-default wpab-wpoa-ignore-preflight">
			<input
				type="hidden"
				name="opopw_has_changes"
				value={hasChanges ? '1' : '0'}
			/>
			<TopProgressBar isSaving={isSaving} />
			<ClassicSettingsTable
				title={__('General Settings', 'optionbay-product-options-addons-woo')}
				description={__(
					'Manage global display and layout preferences for your product options.',
					'optionbay-product-options-addons-woo'
				)}
				fields={[
					{
						id: 'global_optionsOrientation',
						label: __('Options Orientation', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'The visual arrangement of radio and checkbox groups.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<div className="wpab-wpoa-max-w-[300px]">
								<ClassicSelect
									value={settings.global_optionsOrientation}
									onChange={(val) =>
										setSettings({
											...settings,
											global_optionsOrientation: String(
												val
											) as 'vertical' | 'horizontal',
										})
									}
									options={[
										{
											value: 'vertical',
											label: __(
												'Vertical',
												'optionbay-product-options-addons-woo'
											),
										},
										{
											value: 'horizontal',
											label: __(
												'Horizontal',
												'optionbay-product-options-addons-woo'
											),
										},
									]}
									size="regular"
									description={__(
										'How options inside a group are arranged.',
										'optionbay-product-options-addons-woo'
									)}
								/>
							</div>
						),
					},
					{
						id: 'global_fontSizeLabel',
						label: __('Label Font Size', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'Font size for field labels.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<ClassicInput
								value={settings.global_fontSizeLabel}
								onChange={(e) =>
									setSettings({
										...settings,
										global_fontSizeLabel: e.target.value,
									})
								}
								description={__(
									"Use 'inherit' or a value like '14px', '1rem'.",
									'optionbay-product-options-addons-woo'
								)}
								size="regular"
							/>
						),
					},
					{
						id: 'global_fontSizeInput',
						label: __('Input Font Size', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'Font size for inputs and choice labels.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<ClassicInput
								value={settings.global_fontSizeInput}
								onChange={(e) =>
									setSettings({
										...settings,
										global_fontSizeInput: e.target.value,
									})
								}
								description={__(
									"Use 'inherit' or a value like '14px', '1rem'.",
									'optionbay-product-options-addons-woo'
								)}
								size="regular"
							/>
						),
					},
					{
						id: 'global_swatchSize',
						label: __('Color Swatch Size', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'Width and height of color swatches.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<ClassicInput
								value={settings.global_swatchSize}
								onChange={(e) =>
									setSettings({
										...settings,
										global_swatchSize: e.target.value,
									})
								}
								description={__(
									"Default is '32px'.",
									'optionbay-product-options-addons-woo'
								)}
								size="regular"
							/>
						),
					},
					{
						id: 'global_swatchImageSize',
						label: __('Image Swatch Size', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'Width and height of image swatches.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<ClassicInput
								value={settings.global_swatchImageSize}
								onChange={(e) =>
									setSettings({
										...settings,
										global_swatchImageSize: e.target.value,
									})
								}
								description={__(
									"Default is '64px'.",
									'optionbay-product-options-addons-woo'
								)}
								size="regular"
							/>
						),
					},
					{
						id: 'global_swatchRadius',
						label: __('Color Swatch Roundness', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'Border radius of color swatches.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<ClassicInput
								value={settings.global_swatchRadius}
								onChange={(e) =>
									setSettings({
										...settings,
										global_swatchRadius: e.target.value,
									})
								}
								description={__(
									"Use '4px' or '50%'.",
									'optionbay-product-options-addons-woo'
								)}
								size="regular"
							/>
						),
					},
					{
						id: 'global_swatchImageRadius',
						label: __('Image Swatch Roundness', 'optionbay-product-options-addons-woo'),
						tooltip: __(
							'Border radius of image swatches.',
							'optionbay-product-options-addons-woo'
						),
						render: () => (
							<ClassicInput
								value={settings.global_swatchImageRadius}
								onChange={(e) =>
									setSettings({
										...settings,
										global_swatchImageRadius:
											e.target.value,
									})
								}
								description={__(
									"Use '4px' or '50%'.",
									'optionbay-product-options-addons-woo'
								)}
								size="regular"
							/>
						),
					},
				]}
			/>

			<ClassicSettingsTable
				title={__('System & Maintenance', 'optionbay-product-options-addons-woo')}
				description={__(
					'Advanced configurations for data persistence and troubleshooting.',
					'optionbay-product-options-addons-woo'
				)}
				fields={[
					{
						id: 'debug_enableMode',
						label: __('Debug Mode', 'optionbay-product-options-addons-woo'),
						render: () => (
							<ClassicCheckbox
								checked={settings.debug_enableMode}
								onChange={(val) =>
									setSettings({
										...settings,
										debug_enableMode: val,
									})
								}
								label={__(
									'Enable developer logging',
									'optionbay-product-options-addons-woo'
								)}
								description={__(
									'Detailed logs will be written to the database for troubleshooting.',
									'optionbay-product-options-addons-woo'
								)}
							/>
						),
					},
					{
						id: 'advanced_deleteAllOnUninstall',
						label: __('Delete Data on Uninstall', 'optionbay-product-options-addons-woo'),
						render: () => (
							<ClassicCheckbox
								checked={
									settings.advanced_deleteAllOnUninstall
								}
								onChange={(val) =>
									setSettings({
										...settings,
										advanced_deleteAllOnUninstall: val,
									})
								}
								label={__(
									'Purge data on plugin deletion',
									'optionbay-product-options-addons-woo'
								)}
								description={__(
									'CAUTION: If enabled, all OptionBay - Product Options and Addons data (groups, assignments, settings) will be permanently deleted when the plugin is uninstalled.',
									'optionbay-product-options-addons-woo'
								)}
							/>
						),
					},
				]}
			/>


			<div className="wpab-wpoa-mt-8">
				{ /* Native WooCommerce save button is used instead */}
			</div>
		</div>
	);
};

export default Settings;
