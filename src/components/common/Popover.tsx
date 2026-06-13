import React, { useState, useRef, useEffect } from 'react';

export type PopoverAlign =
	| 'top'
	| 'top-left'
	| 'top-right'
	| 'bottom'
	| 'bottom-left'
	| 'bottom-right'
	| 'left'
	| 'right';

interface PopoverProps {
	trigger: React.ReactNode;
	content: React.ReactNode;
	align?: PopoverAlign;
	className?: string;
	classNames?: {
		root?: string;
		triggerWrapper?: string;
		content?: string;
	};
}

export const Popover: React.FC< PopoverProps > = ( {
	trigger,
	content,
	align = 'bottom-left',
	className = '',
	classNames,
} ) => {
	const [ isOpen, setIsOpen ] = useState( false );
	const containerRef = useRef< HTMLDivElement >( null );

	// Close when clicking outside
	useEffect( () => {
		const handleClickOutside = ( event: MouseEvent ) => {
			if (
				containerRef.current &&
				! containerRef.current.contains( event.target as Node )
			) {
				setIsOpen( false );
			}
		};

		if ( isOpen ) {
			document.addEventListener( 'mousedown', handleClickOutside );
		}
		return () => {
			document.removeEventListener( 'mousedown', handleClickOutside );
		};
	}, [ isOpen ] );

	const toggle = () => setIsOpen( ! isOpen );

	// Position & Origin Logic
	let positionClasses = '';
	let originClass = '';

	switch ( align ) {
		case 'top':
			positionClasses =
				'spoa-bottom-full spoa-mb-2 spoa-left-1/2 spoa--translate-x-1/2';
			originClass = 'spoa-origin-bottom';
			break;
		case 'top-left':
			positionClasses =
				'spoa-bottom-full spoa-mb-2 spoa-left-0';
			originClass = 'spoa-origin-bottom-left';
			break;
		case 'top-right':
			positionClasses =
				'spoa-bottom-full spoa-mb-2 spoa-right-0';
			originClass = 'spoa-origin-bottom-right';
			break;
		case 'bottom':
			positionClasses =
				'spoa-top-full spoa-mt-2 spoa-left-1/2 spoa--translate-x-1/2';
			originClass = 'spoa-origin-top';
			break;
		case 'bottom-left':
			positionClasses =
				'spoa-top-full spoa-mt-2 spoa-left-0';
			originClass = 'spoa-origin-top-left';
			break;
		case 'bottom-right':
			positionClasses =
				'spoa-top-full spoa-mt-2 spoa-right-0';
			originClass = 'spoa-origin-top-right';
			break;
		case 'left':
			positionClasses =
				'spoa-right-full spoa-mr-2 spoa-top-1/2 spoa--translate-y-1/2';
			originClass = 'spoa-origin-right';
			break;
		case 'right':
			positionClasses =
				'spoa-left-full spoa-ml-2 spoa-top-1/2 spoa--translate-y-1/2';
			originClass = 'spoa-origin-left';
			break;
		default:
			positionClasses =
				'spoa-top-full spoa-mt-2 spoa-left-0';
			originClass = 'spoa-origin-top-left';
	}

	// Transition classes (Opacity + Scale)
	const transitionClasses = isOpen
		? 'spoa-opacity-100 spoa-scale-100 spoa-pointer-events-auto'
		: 'spoa-opacity-0 spoa-scale-95 spoa-pointer-events-none';

	return (
		<div
			ref={ containerRef }
			className={ `spoa-relative spoa-inline-block ${ className } ${
				classNames?.root || ''
			}` }
		>
			{ /* Trigger Wrapper */ }
			<div
				onClick={ toggle }
				className={ `spoa-cursor-pointer spoa-inline-flex ${
					classNames?.triggerWrapper || ''
				}` }
			>
				{ trigger }
			</div>

			{ /* Dropdown Content */ }
			<div
				className={ `
          spoa-absolute spoa-z-50 spoa-w-48
          spoa-bg-white spoa-rounded-xl spoa-shadow-xl spoa-border spoa-border-default
          spoa-transition-all spoa-duration-200 spoa-ease-out
          ${ positionClasses }
          ${ originClass }
          ${ transitionClasses }
          ${ classNames?.content || '' }
        ` }
			>
				{ content }
			</div>
		</div>
	);
};
