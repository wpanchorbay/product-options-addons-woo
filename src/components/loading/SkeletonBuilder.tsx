import React from 'react';

export const SkeletonBuilder: React.FC = () => {
	return (
		<div className="opopw-animate-pulse opopw-flex opopw-flex-col lg:opopw-flex-row opopw-gap-6 opopw-items-start opopw-w-full">
			{ /* Left side */ }
			<div className="opopw-w-full opopw-flex opopw-flex-col opopw-gap-6">
				{ /* Title Input */ }
				<div className="opopw-h-[50px] opopw-bg-gray-200 opopw-rounded-md opopw-w-full"></div>

				{ /* Assignment rules container */ }
				<div className="opopw-h-[100px] opopw-bg-gray-200 opopw-rounded-lg opopw-w-full"></div>

				{ /* Fields header */ }
				<div>
					<div className="opopw-h-6 opopw-bg-gray-200 opopw-rounded opopw-w-32 opopw-mb-2"></div>
					<div className="opopw-h-4 opopw-bg-gray-200 opopw-rounded opopw-w-64"></div>
				</div>

				{ /* Fields list */ }
				<div className="opopw-border opopw-border-gray-200 opopw-rounded-lg opopw-p-4">
					{ Array.from( { length: 3 } ).map( ( _, i ) => (
						<div
							key={ i }
							className="opopw-h-12 opopw-bg-gray-100 opopw-rounded-md opopw-w-full opopw-mb-2 opopw-flex opopw-items-center opopw-px-4"
						>
							<div className="opopw-h-4 opopw-w-4 opopw-bg-gray-200 opopw-rounded opopw-mr-4"></div>
							<div className="opopw-h-4 opopw-w-32 opopw-bg-gray-200 opopw-rounded opopw-mr-auto"></div>
							<div className="opopw-h-4 opopw-w-24 opopw-bg-gray-200 opopw-rounded"></div>
						</div>
					) ) }
				</div>
			</div>

			{ /* Right Sidebar */ }
			<div className="lg:opopw-w-[320px] opopw-w-full opopw-flex-shrink-0">
				<div className="opopw-h-[500px] opopw-bg-gray-200 opopw-rounded-lg opopw-w-full"></div>
			</div>
		</div>
	);
};
