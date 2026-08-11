import React from 'react';

export const SkeletonAddonList: React.FC = () => {
	const skeletonRows = Array.from( { length: 5 }, ( _, i ) => i );

	return (
		<>
			{ skeletonRows.map( ( index ) => (
				<tr
					key={ index }
					className="opopw-border-b opopw-border-gray-200 opopw-animate-pulse"
				>
					<td className="opopw-p-2">
						<div className="opopw-w-4 opopw-h-4 opopw-bg-gray-200 opopw-rounded"></div>
					</td>
					<td className="opopw-p-2">
						<div className="opopw-h-4 opopw-bg-gray-200 opopw-rounded opopw-w-3/4"></div>
						<div className="opopw-h-3 opopw-bg-gray-200 opopw-rounded opopw-w-1/2 opopw-mt-2"></div>
					</td>
					<td className="opopw-p-2">
						<div className="opopw-h-4 opopw-bg-gray-200 opopw-rounded opopw-w-6"></div>
					</td>
					<td className="opopw-p-2">
						<div className="opopw-h-4 opopw-bg-gray-200 opopw-rounded opopw-w-1/3"></div>
					</td>
					<td className="opopw-p-2">
						<div className="opopw-h-5 opopw-bg-gray-200 opopw-rounded opopw-w-12"></div>
					</td>
				</tr>
			) ) }
		</>
	);
};
