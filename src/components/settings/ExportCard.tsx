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
				addToast(__('Please select at least one entity to export.', 'smart-product-options-addons'), 'error');
				setIsExporting(false);
				return;
			}

			const query = entities.join(',');
			const response = await apiFetch({
				path: `smart-product-options-addons/v1/export?entities=${query}`,
				method: 'GET',
			});

			const dataStr = JSON.stringify(response, null, 2);
			const blob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `spoa-export-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			
			addToast(__('Export downloaded successfully.', 'smart-product-options-addons'), 'success');
		} catch (error: any) {
			console.error('Export failed:', error);
			addToast(error.message || __('Failed to export data.', 'smart-product-options-addons'), 'error');
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="spoa-settings-section spoa-mt-8">
			<h2 className="spoa-ignore-preflight">{__('Export Data', 'smart-product-options-addons')}</h2>
			<p className="description">{__('Select which entities you want to export to a JSON file.', 'smart-product-options-addons')}</p>
			
			<table className="form-table">
				<tbody>
					<tr>
						<th scope="row">
							<label>{__('Entities to Export', 'smart-product-options-addons')}</label>
						</th>
						<td>
							<div className="spoa-flex spoa-flex-col spoa-gap-3">
								<ClassicCheckbox
									checked={exportGroups}
									onChange={setExportGroups}
									label={__('Option Groups', 'smart-product-options-addons')}
								/>
								<ClassicCheckbox
									checked={exportInventory}
									onChange={setExportInventory}
									label={__('Inventory Pools', 'smart-product-options-addons')}
								/>
								<ClassicCheckbox
									checked={exportSettings}
									onChange={setExportSettings}
									label={__('Plugin Settings', 'smart-product-options-addons')}
								/>
							</div>
							<div className="spoa-mt-4">
								<ClassicButton
									variant="primary"
									onClick={handleExport}
									disabled={isExporting || (!exportGroups && !exportInventory && !exportSettings)}
								>
									{isExporting ? __('Exporting...', 'smart-product-options-addons') : __('Download JSON Export', 'smart-product-options-addons')}
								</ClassicButton>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
};
