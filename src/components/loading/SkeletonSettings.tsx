import React from 'react';

export const SkeletonSettings: React.FC = () => {
	const SkeleBox = () => (
		<div className="spoa-mb-8 spoa-bg-white spoa-border spoa-border-gray-200 spoa-rounded-lg spoa-overflow-hidden">
			<div className="spoa-px-6 spoa-py-5 spoa-border-b spoa-border-gray-200">
				<div className="spoa-h-6 spoa-bg-gray-200 spoa-rounded spoa-w-48 spoa-mb-2"></div>
				<div className="spoa-h-4 spoa-bg-gray-200 spoa-rounded spoa-w-96"></div>
			</div>
			<div className="spoa-px-6 spoa-py-6 spoa-flex spoa-flex-col spoa-gap-6">
				{ Array.from( { length: 2 } ).map( ( _, i ) => (
					<div key={ i } className="spoa-flex spoa-gap-4">
						<div className="spoa-w-1/3">
							<div className="spoa-h-5 spoa-bg-gray-200 spoa-rounded spoa-w-32 spoa-mb-2"></div>
							<div className="spoa-h-3 spoa-bg-gray-200 spoa-rounded spoa-w-24"></div>
						</div>
						<div className="spoa-w-2/3">
							<div className="spoa-h-10 spoa-bg-gray-200 spoa-rounded spoa-w-full"></div>
						</div>
					</div>
				) ) }
			</div>
		</div>
	);

	return (
		<div className="spoa-animate-pulse spoa-w-full">
			<SkeleBox />
			<SkeleBox />
			<div className="spoa-h-10 spoa-bg-gray-200 spoa-rounded spoa-w-32 spoa-mt-8"></div>
		</div>
	);
};
