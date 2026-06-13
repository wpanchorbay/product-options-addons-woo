import React from 'react';
import { MultiSelectOption } from '../../utils/types';

/**
 * Custom render for product options in ClassicMultiSelect (shows thumbnail, ID, SKU)
 * @param option
 */
export function renderProductOption( option: MultiSelectOption ) {
	const opt = option as any;
	return (
		<div className="spoa-flex spoa-items-center spoa-gap-2">
			{ opt.image && (
				<img
					src={ opt.image }
					alt=""
					className="spoa-w-8 spoa-h-8 spoa-object-cover spoa-rounded spoa-shrink-0"
				/>
			) }
			<div className="spoa-min-w-0">
				<div className="spoa-font-medium spoa-leading-tight">
					{ opt.label }
				</div>
				<div className="spoa-text-[11px] spoa-text-[#888] spoa-leading-tight">
					ID: { opt.value }
					{ opt.sku ? ` • SKU: ${ opt.sku }` : '' }
				</div>
			</div>
		</div>
	);
}
