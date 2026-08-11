import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { ClassicCheckbox, ClassicButton } from '../classics';
import apiFetch from '@wordpress/api-fetch';
import { useToast } from '../../store/toast/use-toast';

export const ExportCard: React.FC = () => {
	const [exportGroups, setExportGroups] = useState(true);
	const [exportInventory, setExportInventory] = useState(true);
	const [exportSettings, setExportSettings] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const { addToast } = useToast();

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const entities = [];
			if (exportGroups) entities.push('groups');
			if (exportInventory) entities.push('inventory');
			if (exportSettings) entities.push('settings');

			if (entities.length === 0) {
				addToast(__('Please select at least one entity to export.', 'optionbay-product-options-addons-woo'), 'error');
				setIsExporting(false);
				return;
			}

			const query = entities.join(',');
			const response = await apiFetch({
				path: `optionbay-product-options-addons-woo/v1/export?entities=${query}`,
				method: 'GET',
			});

			const dataStr = JSON.stringify(response, null, 2);
			const blob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `opopw-export-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			addToast(__('Export downloaded successfully.', 'optionbay-product-options-addons-woo'), 'success');
		} catch (error: any) {
			console.error('Export failed:', error);
			addToast(error.message || __('Failed to export data.', 'optionbay-product-options-addons-woo'), 'error');
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="opopw-settings-section opopw-mt-8">
			<h2 className="opopw-ignore-preflight">{__('Export Data', 'optionbay-product-options-addons-woo')}</h2>
			<p className="description">{__('Select which entities you want to export to a JSON file.', 'optionbay-product-options-addons-woo')}</p>
			
			<table className="form-table">
				<tbody>
					<tr>
						<th scope="row">
							<label>{__('Entities to Export', 'optionbay-product-options-addons-woo')}</label>
						</th>
						<td>
							<div className="opopw-flex opopw-flex-col opopw-gap-3">
								<ClassicCheckbox
									checked={exportGroups}
									onChange={setExportGroups}
									label={__('Option Groups', 'optionbay-product-options-addons-woo')}
								/>
								<ClassicCheckbox
									checked={exportInventory}
									onChange={setExportInventory}
									label={__('Inventory Pools', 'optionbay-product-options-addons-woo')}
								/>
								<ClassicCheckbox
									checked={exportSettings}
									onChange={setExportSettings}
									label={__('Plugin Settings', 'optionbay-product-options-addons-woo')}
								/>
							</div>
							<div className="opopw-mt-4">
								<ClassicButton
									variant="primary"
									onClick={handleExport}
									disabled={isExporting || (!exportGroups && !exportInventory && !exportSettings)}
								>
									{isExporting ? __('Exporting...', 'optionbay-product-options-addons-woo') : __('Download JSON Export', 'optionbay-product-options-addons-woo')}
								</ClassicButton>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
};
