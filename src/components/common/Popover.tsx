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
				'opopw-bottom-full opopw-mb-2 opopw-left-1/2 opopw--translate-x-1/2';
			originClass = 'opopw-origin-bottom';
			break;
		case 'top-left':
			positionClasses =
				'opopw-bottom-full opopw-mb-2 opopw-left-0';
			originClass = 'opopw-origin-bottom-left';
			break;
		case 'top-right':
			positionClasses =
				'opopw-bottom-full opopw-mb-2 opopw-right-0';
			originClass = 'opopw-origin-bottom-right';
			break;
		case 'bottom':
			positionClasses =
				'opopw-top-full opopw-mt-2 opopw-left-1/2 opopw--translate-x-1/2';
			originClass = 'opopw-origin-top';
			break;
		case 'bottom-left':
			positionClasses =
				'opopw-top-full opopw-mt-2 opopw-left-0';
			originClass = 'opopw-origin-top-left';
			break;
		case 'bottom-right':
			positionClasses =
				'opopw-top-full opopw-mt-2 opopw-right-0';
			originClass = 'opopw-origin-top-right';
			break;
		case 'left':
			positionClasses =
				'opopw-right-full opopw-mr-2 opopw-top-1/2 opopw--translate-y-1/2';
			originClass = 'opopw-origin-right';
			break;
		case 'right':
			positionClasses =
				'opopw-left-full opopw-ml-2 opopw-top-1/2 opopw--translate-y-1/2';
			originClass = 'opopw-origin-left';
			break;
		default:
			positionClasses =
				'opopw-top-full opopw-mt-2 opopw-left-0';
			originClass = 'opopw-origin-top-left';
	}

	// Transition classes (Opacity + Scale)
	const transitionClasses = isOpen
		? 'opopw-opacity-100 opopw-scale-100 opopw-pointer-events-auto'
		: 'opopw-opacity-0 opopw-scale-95 opopw-pointer-events-none';

	return (
		<div
			ref={ containerRef }
			className={ `opopw-relative opopw-inline-block ${ className } ${
				classNames?.root || ''
			}` }
		>
			{ /* Trigger Wrapper */ }
			<div
				onClick={ toggle }
				className={ `opopw-cursor-pointer opopw-inline-flex ${
					classNames?.triggerWrapper || ''
				}` }
			>
				{ trigger }
			</div>

			{ /* Dropdown Content */ }
			<div
				className={ `
          opopw-absolute opopw-z-50 opopw-w-48
          opopw-bg-white opopw-rounded-xl opopw-shadow-xl opopw-border opopw-border-default
          opopw-transition-all opopw-duration-200 opopw-ease-out
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
