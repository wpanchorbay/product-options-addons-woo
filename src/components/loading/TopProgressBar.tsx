import React, { useEffect, useState } from 'react';

interface TopProgressBarProps {
	isSaving: boolean;
}

export const TopProgressBar: React.FC< TopProgressBarProps > = ( {
	isSaving,
} ) => {
	const [ progress, setProgress ] = useState( 0 );

	useEffect( () => {
		let interval: NodeJS.Timeout;
		if ( isSaving ) {
			setProgress( 0 );
			interval = setInterval( () => {
				setProgress( ( prev ) => {
					if ( prev >= 90 ) {
						clearInterval( interval );
						return prev;
					}
					const jump = Math.random() * 10;
					return prev + jump;
				} );
			}, 300 );
		} else {
			setProgress( 100 );
			const timeout = setTimeout( () => {
				setProgress( 0 );
			}, 500 ); // Wait for transition to finish before resetting

			return () => clearTimeout( timeout );
		}

		return () => {
			if ( interval ) {
				clearInterval( interval );
			}
		};
	}, [ isSaving ] );

	if ( ! isSaving && progress === 0 ) {
		return null;
	}

	return (
		<div className="spoa-fixed spoa-top-0 spoa-left-0 spoa-w-full spoa-h-[3px] spoa-z-[99999] spoa-pointer-events-none">
			<div
				className="spoa-h-full spoa-bg-[#2271b1] spoa-transition-all spoa-duration-300 spoa-ease-out"
				style={ {
					width: `${ progress }%`,
					opacity: progress === 100 ? 0 : 1,
				} }
			/>
		</div>
	);
};
