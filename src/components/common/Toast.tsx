import React, { useEffect, useState, FC } from 'react';

import { Toast as ToastType } from '../../store/toast/use-toast';
import { close, Icon } from '@wordpress/icons';
import { AlertCircle, Eye } from 'lucide-react';
import { __ } from '@wordpress/i18n';

interface ToastProps {
	toast: ToastType;
	onDismiss: ( id: number ) => void;
}
export const Toast: FC< ToastProps > = ( { toast, onDismiss } ) => {
	const [ isClosing, setIsClosing ] = useState< boolean >( false );

	const handleDismiss = () => {
		setIsClosing( true );
		setTimeout( () => {
			onDismiss( toast.id );
		}, 300 ); // 300ms animation
	};

	useEffect( () => {
		const timer = setTimeout( () => {
			handleDismiss();
		}, toast.meta ? 9000 : 5000 ); // Structured validation error toasts stay longer (9s)
		return () => {
			clearTimeout( timer );
		};
	}, [ toast.id ] );

	const getToastTypeClasses = () => {
		switch ( toast.type ) {
			case 'success':
				return 'spoa-bg-[#f0fff4] spoa-border-l-[#228b22] spoa-text-[#1a472a]';
			case 'error':
				return 'spoa-bg-[#fff5f5] spoa-border-l-[#cc0000] spoa-text-[#5c2121]';
			case 'info':
			default:
				return 'spoa-bg-white spoa-border-l-[#2271b1] spoa-text-[#1d2327]';
		}
	};

	const toastClasses = `
    spoa-relative spoa-p-5 spoa-rounded-[4px] spoa-shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
    spoa-flex spoa-items-start spoa-justify-between spoa-gap-[15px] 
    spoa-border-l-[5px] spoa-backdrop-blur-[3px] spoa-max-w-[360px] spoa-w-[360px] spoa-pointer-events-auto
    ${
		isClosing ? 'spoa-animate-slide-out' : 'spoa-animate-slide-in'
	}
    ${ getToastTypeClasses() }
  `;

	return (
		<div className={ toastClasses }>
			<div className="spoa-flex-1">
				{ toast.meta ? (
					<div className="spoa-flex spoa-flex-col spoa-gap-1.5 spoa-w-full">
						{/* Header row with badges */}
						<div className="spoa-flex spoa-items-center spoa-gap-1.5 spoa-flex-wrap">
							<span className="spoa-bg-[#fee2e2] spoa-text-[#991b1b] spoa-text-[11px] spoa-font-bold spoa-px-2 spoa-py-0.5 spoa-rounded spoa-uppercase spoa-tracking-wider">
								{ toast.meta.fieldName || __( 'Validation Error', 'smart-product-options-addons' ) }
							</span>
							{ toast.meta.section && (
								<span className="spoa-bg-[#eaeaea] spoa-text-[#444] spoa-text-[10px] spoa-font-semibold spoa-px-1.5 spoa-py-0.5 spoa-rounded spoa-capitalize">
									{ toast.meta.section }
								</span>
							) }
						</div>

						{/* Error Message */}
						<div className="spoa-flex spoa-items-start spoa-gap-2 spoa-mt-1">
							<AlertCircle className="spoa-text-[#cc0000] spoa-shrink-0 spoa-mt-0.5" size={15} />
							<p className="spoa-m-0 spoa-text-[13px] spoa-font-medium spoa-leading-[1.4] spoa-text-[#3c1e1e]">
								{ toast.meta.errorText || toast.message }
							</p>
						</div>

						{/* Quick Action Button to Locate & Edit Field */}
						{ toast.meta.fieldId && (
							<button
								onClick={ () => {
									const fieldId = toast.meta!.fieldId!;
									const el = document.getElementById( `ob-field-row-${ fieldId }` );
									if ( el ) {
										// Scroll perfectly to middle of viewport
										el.scrollIntoView( { behavior: 'smooth', block: 'center' } );
										
										// Auto expand if collapsed
										if ( el.getAttribute( 'data-expanded' ) !== 'true' ) {
											const header = el.querySelector( '.spoa-cursor-pointer' );
											if ( header ) {
												( header as HTMLElement ).click();
											}
										}

										// Apply pulse flash animation
										el.classList.remove( 'spoa-flash-highlight' );
										void el.offsetWidth; // Force CSS reflow
										el.classList.add( 'spoa-flash-highlight' );
										setTimeout( () => {
											el.classList.remove( 'spoa-flash-highlight' );
										}, 2000 );
									}
								} }
								className="spoa-self-start spoa-mt-2 spoa-flex spoa-items-center spoa-gap-1 spoa-text-[11px] spoa-font-bold spoa-text-[#cc0000] hover:spoa-text-white spoa-bg-transparent hover:spoa-bg-[#cc0000] spoa-border spoa-border-[#cc0000] spoa-px-2.5 spoa-py-1 spoa-rounded spoa-transition-all spoa-cursor-pointer"
							>
								<Eye size={12} />
								{ __( 'Locate & Edit Field', 'smart-product-options-addons' ) }
							</button>
						) }
					</div>
				) : (
					<p className="spoa-m-0 spoa-text-[14px] spoa-leading-[1.5] spoa-flex-1">
						{ toast.message }
					</p>
				) }
			</div>
			<button
				className="spoa-bg-none spoa-border-none spoa-text-inherit spoa-opacity-60 hover:spoa-opacity-100 spoa-cursor-pointer spoa-text-[20px] spoa-leading-none spoa-px-[5px] spoa-self-start -spoa-mt-[5px] -spoa-mr-[5px] -spoa-mb-[5px] spoa-ml-0"
				onClick={ handleDismiss }
				aria-label="Dismiss"
			>
				<Icon icon={ close } />
			</button>
		</div>
	);
};

export default Toast;
