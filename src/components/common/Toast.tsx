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
				return 'opopw-bg-[#f0fff4] opopw-border-l-[#228b22] opopw-text-[#1a472a]';
			case 'error':
				return 'opopw-bg-[#fff5f5] opopw-border-l-[#cc0000] opopw-text-[#5c2121]';
			case 'info':
			default:
				return 'opopw-bg-white opopw-border-l-[#2271b1] opopw-text-[#1d2327]';
		}
	};

	const toastClasses = `
    opopw-relative opopw-p-5 opopw-rounded-[4px] opopw-shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
    opopw-flex opopw-items-start opopw-justify-between opopw-gap-[15px] 
    opopw-border-l-[5px] opopw-backdrop-blur-[3px] opopw-max-w-[360px] opopw-w-[360px] opopw-pointer-events-auto
    ${
		isClosing ? 'opopw-animate-slide-out' : 'opopw-animate-slide-in'
	}
    ${ getToastTypeClasses() }
  `;

	return (
		<div className={ toastClasses }>
			<div className="opopw-flex-1">
				{ toast.meta ? (
					<div className="opopw-flex opopw-flex-col opopw-gap-1.5 opopw-w-full">
						{/* Header row with badges */}
						<div className="opopw-flex opopw-items-center opopw-gap-1.5 opopw-flex-wrap">
							<span className="opopw-bg-[#fee2e2] opopw-text-[#991b1b] opopw-text-[11px] opopw-font-bold opopw-px-2 opopw-py-0.5 opopw-rounded opopw-uppercase opopw-tracking-wider">
								{ toast.meta.fieldName || __( 'Validation Error', 'optionbay-product-options-addons-woo' ) }
							</span>
							{ toast.meta.section && (
								<span className="opopw-bg-[#eaeaea] opopw-text-[#444] opopw-text-[10px] opopw-font-semibold opopw-px-1.5 opopw-py-0.5 opopw-rounded opopw-capitalize">
									{ toast.meta.section }
								</span>
							) }
						</div>

						{/* Error Message */}
						<div className="opopw-flex opopw-items-start opopw-gap-2 opopw-mt-1">
							<AlertCircle className="opopw-text-[#cc0000] opopw-shrink-0 opopw-mt-0.5" size={15} />
							<p className="opopw-m-0 opopw-text-[13px] opopw-font-medium opopw-leading-[1.4] opopw-text-[#3c1e1e]">
								{ toast.meta.errorText || toast.message }
							</p>
						</div>

						{/* Quick Action Button to Locate & Edit Field */}
						{ toast.meta.fieldId && (
							<button
								onClick={ () => {
									const fieldId = toast.meta!.fieldId!;
									const el = document.getElementById( `opopw-field-row-${ fieldId }` );
									if ( el ) {
										// Scroll perfectly to middle of viewport
										el.scrollIntoView( { behavior: 'smooth', block: 'center' } );
										
										// Auto expand if collapsed
										if ( el.getAttribute( 'data-expanded' ) !== 'true' ) {
											const header = el.querySelector( '.opopw-cursor-pointer' );
											if ( header ) {
												( header as HTMLElement ).click();
											}
										}

										// Apply pulse flash animation
										el.classList.remove( 'opopw-flash-highlight' );
										void el.offsetWidth; // Force CSS reflow
										el.classList.add( 'opopw-flash-highlight' );
										setTimeout( () => {
											el.classList.remove( 'opopw-flash-highlight' );
										}, 2000 );
									}
								} }
								className="opopw-self-start opopw-mt-2 opopw-flex opopw-items-center opopw-gap-1 opopw-text-[11px] opopw-font-bold opopw-text-[#cc0000] hover:opopw-text-white opopw-bg-transparent hover:opopw-bg-[#cc0000] opopw-border opopw-border-[#cc0000] opopw-px-2.5 opopw-py-1 opopw-rounded opopw-transition-all opopw-cursor-pointer"
							>
								<Eye size={12} />
								{ __( 'Locate & Edit Field', 'optionbay-product-options-addons-woo' ) }
							</button>
						) }
					</div>
				) : (
					<p className="opopw-m-0 opopw-text-[14px] opopw-leading-[1.5] opopw-flex-1">
						{ toast.message }
					</p>
				) }
			</div>
			<button
				className="opopw-bg-none opopw-border-none opopw-text-inherit opopw-opacity-60 hover:opopw-opacity-100 opopw-cursor-pointer opopw-text-[20px] opopw-leading-none opopw-px-[5px] opopw-self-start -opopw-mt-[5px] -opopw-mr-[5px] -opopw-mb-[5px] opopw-ml-0"
				onClick={ handleDismiss }
				aria-label="Dismiss"
			>
				<Icon icon={ close } />
			</button>
		</div>
	);
};

export default Toast;
