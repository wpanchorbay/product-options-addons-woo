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
		<div className="opopw-settings-section opopw-mt-8 opopw-mb-8">
			<h2 className="opopw-ignore-preflight">{__('Import Data', 'optionbay-product-options-addons-woo')}</h2>
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
								className="opopw-block opopw-w-full opopw-max-w-md opopw-text-sm opopw-text-gray-500 file:opopw-mr-4 file:opopw-py-2 file:opopw-px-4 file:opopw-rounded-full file:opopw-border-0 file:opopw-text-sm file:opopw-font-semibold file:opopw-bg-blue-50 file:opopw-text-blue-700 hover:file:opopw-bg-blue-100"
							/>

							{parsedData && (
								<div className="opopw-mt-6 opopw-bg-gray-50 opopw-p-4 opopw-rounded-lg opopw-border opopw-border-gray-200">
									<h4 className="opopw-mt-0 opopw-mb-3 opopw-font-semibold">{__('What would you like to import?', 'optionbay-product-options-addons-woo')}</h4>
									<div className="opopw-flex opopw-flex-col opopw-gap-3">
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
									<div className="opopw-mt-4">
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
