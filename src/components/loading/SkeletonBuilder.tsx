import React from 'react';

export const SkeletonBuilder: React.FC = () => {
	return (
		<div className="spoa-animate-pulse spoa-flex spoa-flex-col lg:spoa-flex-row spoa-gap-6 spoa-items-start spoa-w-full">
			{ /* Left side */ }
			<div className="spoa-w-full spoa-flex spoa-flex-col spoa-gap-6">
				{ /* Title Input */ }
				<div className="spoa-h-[50px] spoa-bg-gray-200 spoa-rounded-md spoa-w-full"></div>

				{ /* Assignment rules container */ }
				<div className="spoa-h-[100px] spoa-bg-gray-200 spoa-rounded-lg spoa-w-full"></div>

				{ /* Fields header */ }
				<div>
					<div className="spoa-h-6 spoa-bg-gray-200 spoa-rounded spoa-w-32 spoa-mb-2"></div>
					<div className="spoa-h-4 spoa-bg-gray-200 spoa-rounded spoa-w-64"></div>
				</div>

				{ /* Fields list */ }
				<div className="spoa-border spoa-border-gray-200 spoa-rounded-lg spoa-p-4">
					{ Array.from( { length: 3 } ).map( ( _, i ) => (
						<div
							key={ i }
							className="spoa-h-12 spoa-bg-gray-100 spoa-rounded-md spoa-w-full spoa-mb-2 spoa-flex spoa-items-center spoa-px-4"
						>
							<div className="spoa-h-4 spoa-w-4 spoa-bg-gray-200 spoa-rounded spoa-mr-4"></div>
							<div className="spoa-h-4 spoa-w-32 spoa-bg-gray-200 spoa-rounded spoa-mr-auto"></div>
							<div className="spoa-h-4 spoa-w-24 spoa-bg-gray-200 spoa-rounded"></div>
						</div>
					) ) }
				</div>
			</div>

			{ /* Right Sidebar */ }
			<div className="lg:spoa-w-[320px] spoa-w-full spoa-flex-shrink-0">
				<div className="spoa-h-[500px] spoa-bg-gray-200 spoa-rounded-lg spoa-w-full"></div>
			</div>
		</div>
	);
};
