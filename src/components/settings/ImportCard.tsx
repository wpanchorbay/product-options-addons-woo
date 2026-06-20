import React, { useState, useRef } from 'react';
import { __ } from '@wordpress/i18n';
import { ClassicCheckbox, ClassicButton } from '../classics';
import apiFetch from '@wordpress/api-fetch';
import { useToast } from '../../store/toast/use-toast';

export const ImportCard: React.FC = () => {
	const [file, setFile] = useState<File | null>(null);
	const [parsedData, setParsedData] = useState<any>(null);
	const [importGroups, setImportGroups] = useState(true);
	const [importInventory, setImportInventory] = useState(true);
	const [importSettings, setImportSettings] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { addToast } = useToast();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		// Explicit check for .json extension
		if (!selectedFile.name.toLowerCase().endsWith('.json')) {
			addToast(__('Please select a valid .json file.', 'optionbay-product-options-addons-woo'), 'error');
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
			return;
		}

		setFile(selectedFile);

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				setParsedData(json);
				setImportGroups(!!(json.groups && json.groups.length));
				setImportInventory(!!(json.inventory && json.inventory.length));
				setImportSettings(!!json.settings);
			} catch (error) {
				addToast(__('Invalid JSON file.', 'optionbay-product-options-addons-woo'), 'error');
				setParsedData(null);
				setFile(null);
			}
		};
		reader.readAsText(selectedFile);
	};

	const handleImport = async () => {
		if (!parsedData) return;
		setIsImporting(true);

		try {
			const payload: any = {};
			if (importGroups && parsedData.groups) payload.groups = parsedData.groups;
			if (importInventory && parsedData.inventory) payload.inventory = parsedData.inventory;
			if (importSettings && parsedData.settings) payload.settings = parsedData.settings;

			if (Object.keys(payload).length === 0) {
				addToast(__('Please select at least one entity to import.', 'optionbay-product-options-addons-woo'), 'error');
				setIsImporting(false);
				return;
			}

			const response: any = await apiFetch({
				path: 'optionbay-product-options-addons-woo/v1/import',
				method: 'POST',
				data: payload,
			});

			if (response.success) {
				addToast(__('Data imported successfully. Please reload the page to see changes.', 'optionbay-product-options-addons-woo'), 'success');
				setFile(null);
				setParsedData(null);
				if (fileInputRef.current) {
					fileInputRef.current.value = '';
				}
			}
		} catch (error: any) {
			console.error('Import failed:', error);
			addToast(error.message || __('Failed to import data.', 'optionbay-product-options-addons-woo'), 'error');
		} finally {
			setIsImporting(false);
		}
	};

	return (
		<div className="wpab-wpoa-settings-section wpab-wpoa-mt-8 wpab-wpoa-mb-8">
			<h2 className="wpab-wpoa-ignore-preflight">{__('Import Data', 'optionbay-product-options-addons-woo')}</h2>
			<p className="description">{__('Upload an OptionBay - Product Options and Addons JSON export file to restore data.', 'optionbay-product-options-addons-woo')}</p>

			<table className="form-table">
				<tbody>
					<tr>
						<th scope="row">
							<label>{__('JSON File', 'optionbay-product-options-addons-woo')}</label>
						</th>
						<td>
							<input
								type="file"
								accept=".json,application/json"
								onChange={handleFileChange}
								ref={fileInputRef}
								className="wpab-wpoa-block wpab-wpoa-w-full wpab-wpoa-max-w-md wpab-wpoa-text-sm wpab-wpoa-text-gray-500 file:wpab-wpoa-mr-4 file:wpab-wpoa-py-2 file:wpab-wpoa-px-4 file:wpab-wpoa-rounded-full file:wpab-wpoa-border-0 file:wpab-wpoa-text-sm file:wpab-wpoa-font-semibold file:wpab-wpoa-bg-blue-50 file:wpab-wpoa-text-blue-700 hover:file:wpab-wpoa-bg-blue-100"
							/>

							{parsedData && (
								<div className="wpab-wpoa-mt-6 wpab-wpoa-bg-gray-50 wpab-wpoa-p-4 wpab-wpoa-rounded-lg wpab-wpoa-border wpab-wpoa-border-gray-200">
									<h4 className="wpab-wpoa-mt-0 wpab-wpoa-mb-3 wpab-wpoa-font-semibold">{__('What would you like to import?', 'optionbay-product-options-addons-woo')}</h4>
									<div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-3">
										{parsedData.groups && parsedData.groups.length > 0 && (
											<ClassicCheckbox
												checked={importGroups}
												onChange={setImportGroups}
												label={__('Option Groups (Appends as new)', 'optionbay-product-options-addons-woo')}
											/>
										)}
										{parsedData.inventory && parsedData.inventory.length > 0 && (
											<ClassicCheckbox
												checked={importInventory}
												onChange={setImportInventory}
												label={__('Inventory Pools (Appends as new)', 'optionbay-product-options-addons-woo')}
											/>
										)}
										{parsedData.settings && (
											<ClassicCheckbox
												checked={importSettings}
												onChange={setImportSettings}
												label={__('Plugin Settings (Overwrites current)', 'optionbay-product-options-addons-woo')}
											/>
										)}
									</div>
									<div className="wpab-wpoa-mt-4">
										<ClassicButton
											variant="primary"
											onClick={handleImport}
											disabled={isImporting || (!importGroups && !importInventory && !importSettings)}
										>
											{isImporting ? __('Importing...', 'optionbay-product-options-addons-woo') : __('Run Import', 'optionbay-product-options-addons-woo')}
										</ClassicButton>
									</div>
								</div>
							)}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
};
