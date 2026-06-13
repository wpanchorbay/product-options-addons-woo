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
			addToast(__('Please select a valid .json file.', 'smart-product-options-addons'), 'error');
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
				addToast(__('Invalid JSON file.', 'smart-product-options-addons'), 'error');
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
				addToast(__('Please select at least one entity to import.', 'smart-product-options-addons'), 'error');
				setIsImporting(false);
				return;
			}

			const response: any = await apiFetch({
				path: 'smart-product-options-addons/v1/import',
				method: 'POST',
				data: payload,
			});

			if (response.success) {
				addToast(__('Data imported successfully. Please reload the page to see changes.', 'smart-product-options-addons'), 'success');
				setFile(null);
				setParsedData(null);
				if (fileInputRef.current) {
					fileInputRef.current.value = '';
				}
			}
		} catch (error: any) {
			console.error('Import failed:', error);
			addToast(error.message || __('Failed to import data.', 'smart-product-options-addons'), 'error');
		} finally {
			setIsImporting(false);
		}
	};

	return (
		<div className="spoa-settings-section spoa-mt-8 spoa-mb-8">
			<h2 className="spoa-ignore-preflight">{__('Import Data', 'smart-product-options-addons')}</h2>
			<p className="description">{__('Upload an Smart Product Options and Addons JSON export file to restore data.', 'smart-product-options-addons')}</p>

			<table className="form-table">
				<tbody>
					<tr>
						<th scope="row">
							<label>{__('JSON File', 'smart-product-options-addons')}</label>
						</th>
						<td>
							<input
								type="file"
								accept=".json,application/json"
								onChange={handleFileChange}
								ref={fileInputRef}
								className="spoa-block spoa-w-full spoa-max-w-md spoa-text-sm spoa-text-gray-500 file:spoa-mr-4 file:spoa-py-2 file:spoa-px-4 file:spoa-rounded-full file:spoa-border-0 file:spoa-text-sm file:spoa-font-semibold file:spoa-bg-blue-50 file:spoa-text-blue-700 hover:file:spoa-bg-blue-100"
							/>

							{parsedData && (
								<div className="spoa-mt-6 spoa-bg-gray-50 spoa-p-4 spoa-rounded-lg spoa-border spoa-border-gray-200">
									<h4 className="spoa-mt-0 spoa-mb-3 spoa-font-semibold">{__('What would you like to import?', 'smart-product-options-addons')}</h4>
									<div className="spoa-flex spoa-flex-col spoa-gap-3">
										{parsedData.groups && parsedData.groups.length > 0 && (
											<ClassicCheckbox
												checked={importGroups}
												onChange={setImportGroups}
												label={__('Option Groups (Appends as new)', 'smart-product-options-addons')}
											/>
										)}
										{parsedData.inventory && parsedData.inventory.length > 0 && (
											<ClassicCheckbox
												checked={importInventory}
												onChange={setImportInventory}
												label={__('Inventory Pools (Appends as new)', 'smart-product-options-addons')}
											/>
										)}
										{parsedData.settings && (
											<ClassicCheckbox
												checked={importSettings}
												onChange={setImportSettings}
												label={__('Plugin Settings (Overwrites current)', 'smart-product-options-addons')}
											/>
										)}
									</div>
									<div className="spoa-mt-4">
										<ClassicButton
											variant="primary"
											onClick={handleImport}
											disabled={isImporting || (!importGroups && !importInventory && !importSettings)}
										>
											{isImporting ? __('Importing...', 'smart-product-options-addons') : __('Run Import', 'smart-product-options-addons')}
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
