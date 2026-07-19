import React from 'react';

export const SkeletonSettings: React.FC = () => {
	const SkeleBox = () => (
		<div className="opopw-mb-8 opopw-bg-white opopw-border opopw-border-gray-200 opopw-rounded-lg opopw-overflow-hidden">
			<div className="opopw-px-6 opopw-py-5 opopw-border-b opopw-border-gray-200">
				<div className="opopw-h-6 opopw-bg-gray-200 opopw-rounded opopw-w-48 opopw-mb-2"></div>
				<div className="opopw-h-4 opopw-bg-gray-200 opopw-rounded opopw-w-96"></div>
			</div>
			<div className="opopw-px-6 opopw-py-6 opopw-flex opopw-flex-col opopw-gap-6">
				{ Array.from( { length: 2 } ).map( ( _, i ) => (
					<div key={ i } className="opopw-flex opopw-gap-4">
						<div className="opopw-w-1/3">
							<div className="opopw-h-5 opopw-bg-gray-200 opopw-rounded opopw-w-32 opopw-mb-2"></div>
							<div className="opopw-h-3 opopw-bg-gray-200 opopw-rounded opopw-w-24"></div>
						</div>
						<div className="opopw-w-2/3">
							<div className="opopw-h-10 opopw-bg-gray-200 opopw-rounded opopw-w-full"></div>
						</div>
					</div>
				) ) }
			</div>
		</div>
	);

	return (
		<div className="opopw-animate-pulse opopw-w-full">
			<SkeleBox />
			<SkeleBox />
			<div className="opopw-h-10 opopw-bg-gray-200 opopw-rounded opopw-w-32 opopw-mt-8"></div>
		</div>
	);
};
