import React from 'react';
import { MultiSelectOption } from '../../utils/types';

/**
 * Custom render for product options in ClassicMultiSelect (shows thumbnail, ID, SKU)
 * @param option
 */
export function renderProductOption( option: MultiSelectOption ) {
	const opt = option as any;
	return (
		<div className="opopw-flex opopw-items-center opopw-gap-2">
			{ opt.image && (
				<img
					src={ opt.image }
					alt=""
					className="opopw-w-8 opopw-h-8 opopw-object-cover opopw-rounded opopw-shrink-0"
				/>
			) }
			<div className="opopw-min-w-0">
				<div className="opopw-font-medium opopw-leading-tight">
					{ opt.label }
				</div>
				<div className="opopw-text-[11px] opopw-text-[#888] opopw-leading-tight">
					ID: { opt.value }
					{ opt.sku ? ` • SKU: ${ opt.sku }` : '' }
				</div>
			</div>
		</div>
	);
}
