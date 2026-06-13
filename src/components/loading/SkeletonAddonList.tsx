import React from 'react';

export const SkeletonAddonList: React.FC = () => {
	const skeletonRows = Array.from( { length: 5 }, ( _, i ) => i );

	return (
		<>
			{ skeletonRows.map( ( index ) => (
				<tr
					key={ index }
					className="spoa-border-b spoa-border-gray-200 spoa-animate-pulse"
				>
					<td className="spoa-p-2">
						<div className="spoa-w-4 spoa-h-4 spoa-bg-gray-200 spoa-rounded"></div>
					</td>
					<td className="spoa-p-2">
						<div className="spoa-h-4 spoa-bg-gray-200 spoa-rounded spoa-w-3/4"></div>
						<div className="spoa-h-3 spoa-bg-gray-200 spoa-rounded spoa-w-1/2 spoa-mt-2"></div>
					</td>
					<td className="spoa-p-2">
						<div className="spoa-h-4 spoa-bg-gray-200 spoa-rounded spoa-w-6"></div>
					</td>
					<td className="spoa-p-2">
						<div className="spoa-h-4 spoa-bg-gray-200 spoa-rounded spoa-w-1/3"></div>
					</td>
					<td className="spoa-p-2">
						<div className="spoa-h-5 spoa-bg-gray-200 spoa-rounded spoa-w-12"></div>
					</td>
				</tr>
			) ) }
		</>
	);
};
