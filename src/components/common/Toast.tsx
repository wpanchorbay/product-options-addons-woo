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
				return 'wpab-wpoa-bg-[#f0fff4] wpab-wpoa-border-l-[#228b22] wpab-wpoa-text-[#1a472a]';
			case 'error':
				return 'wpab-wpoa-bg-[#fff5f5] wpab-wpoa-border-l-[#cc0000] wpab-wpoa-text-[#5c2121]';
			case 'info':
			default:
				return 'wpab-wpoa-bg-white wpab-wpoa-border-l-[#2271b1] wpab-wpoa-text-[#1d2327]';
		}
	};

	const toastClasses = `
    wpab-wpoa-relative wpab-wpoa-p-5 wpab-wpoa-rounded-[4px] wpab-wpoa-shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
    wpab-wpoa-flex wpab-wpoa-items-start wpab-wpoa-justify-between wpab-wpoa-gap-[15px] 
    wpab-wpoa-border-l-[5px] wpab-wpoa-backdrop-blur-[3px] wpab-wpoa-max-w-[360px] wpab-wpoa-w-[360px] wpab-wpoa-pointer-events-auto
    ${
		isClosing ? 'wpab-wpoa-animate-slide-out' : 'wpab-wpoa-animate-slide-in'
	}
    ${ getToastTypeClasses() }
  `;

	return (
		<div className={ toastClasses }>
			<div className="wpab-wpoa-flex-1">
				{ toast.meta ? (
					<div className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-1.5 wpab-wpoa-w-full">
						{/* Header row with badges */}
						<div className="wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1.5 wpab-wpoa-flex-wrap">
							<span className="wpab-wpoa-bg-[#fee2e2] wpab-wpoa-text-[#991b1b] wpab-wpoa-text-[11px] wpab-wpoa-font-bold wpab-wpoa-px-2 wpab-wpoa-py-0.5 wpab-wpoa-rounded wpab-wpoa-uppercase wpab-wpoa-tracking-wider">
								{ toast.meta.fieldName || __( 'Validation Error', 'optionbay-product-options-addons-woo' ) }
							</span>
							{ toast.meta.section && (
								<span className="wpab-wpoa-bg-[#eaeaea] wpab-wpoa-text-[#444] wpab-wpoa-text-[10px] wpab-wpoa-font-semibold wpab-wpoa-px-1.5 wpab-wpoa-py-0.5 wpab-wpoa-rounded wpab-wpoa-capitalize">
									{ toast.meta.section }
								</span>
							) }
						</div>

						{/* Error Message */}
						<div className="wpab-wpoa-flex wpab-wpoa-items-start wpab-wpoa-gap-2 wpab-wpoa-mt-1">
							<AlertCircle className="wpab-wpoa-text-[#cc0000] wpab-wpoa-shrink-0 wpab-wpoa-mt-0.5" size={15} />
							<p className="wpab-wpoa-m-0 wpab-wpoa-text-[13px] wpab-wpoa-font-medium wpab-wpoa-leading-[1.4] wpab-wpoa-text-[#3c1e1e]">
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
											const header = el.querySelector( '.wpab-wpoa-cursor-pointer' );
											if ( header ) {
												( header as HTMLElement ).click();
											}
										}

										// Apply pulse flash animation
										el.classList.remove( 'wpab-wpoa-flash-highlight' );
										void el.offsetWidth; // Force CSS reflow
										el.classList.add( 'wpab-wpoa-flash-highlight' );
										setTimeout( () => {
											el.classList.remove( 'wpab-wpoa-flash-highlight' );
										}, 2000 );
									}
								} }
								className="wpab-wpoa-self-start wpab-wpoa-mt-2 wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-1 wpab-wpoa-text-[11px] wpab-wpoa-font-bold wpab-wpoa-text-[#cc0000] hover:wpab-wpoa-text-white wpab-wpoa-bg-transparent hover:wpab-wpoa-bg-[#cc0000] wpab-wpoa-border wpab-wpoa-border-[#cc0000] wpab-wpoa-px-2.5 wpab-wpoa-py-1 wpab-wpoa-rounded wpab-wpoa-transition-all wpab-wpoa-cursor-pointer"
							>
								<Eye size={12} />
								{ __( 'Locate & Edit Field', 'optionbay-product-options-addons-woo' ) }
							</button>
						) }
					</div>
				) : (
					<p className="wpab-wpoa-m-0 wpab-wpoa-text-[14px] wpab-wpoa-leading-[1.5] wpab-wpoa-flex-1">
						{ toast.message }
					</p>
				) }
			</div>
			<button
				className="wpab-wpoa-bg-none wpab-wpoa-border-none wpab-wpoa-text-inherit wpab-wpoa-opacity-60 hover:wpab-wpoa-opacity-100 wpab-wpoa-cursor-pointer wpab-wpoa-text-[20px] wpab-wpoa-leading-none wpab-wpoa-px-[5px] wpab-wpoa-self-start -wpab-wpoa-mt-[5px] -wpab-wpoa-mr-[5px] -wpab-wpoa-mb-[5px] wpab-wpoa-ml-0"
				onClick={ handleDismiss }
				aria-label="Dismiss"
			>
				<Icon icon={ close } />
			</button>
		</div>
	);
};

export default Toast;
