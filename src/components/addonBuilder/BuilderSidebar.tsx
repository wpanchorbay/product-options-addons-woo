import React, { useRef, useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { ClassicButton, ClassicSelect, ClassicInput } from '../classics';
import { useAddonContext, getDefaultField } from '../../store/AddonContext';
import { FIELD_TYPES, FIELD_TYPE_ICONS } from './constants';
import { FormError } from './FormError';
import { Plus, X, CirclePlus } from 'lucide-react';

export const BuilderSidebar: React.FC = () => {
	const { state, dispatch } = useAddonContext();
	const addFieldsRef = useRef< HTMLDivElement >( null );
	const [ isAddFieldsVisible, setIsAddFieldsVisible ] = useState( true );
	const [ fabOpen, setFabOpen ] = useState( false );

	const addField = ( type: string ) => {
		const field = getDefaultField( type );
		dispatch( { type: 'ADD_FIELD', payload: field } );
		setFabOpen( false );
	};

	// Observe whether the "Add Fields" card is in the viewport
	useEffect( () => {
		const node = addFieldsRef.current;
		if ( ! node ) {
			return;
		}

		const observer = new IntersectionObserver(
			( [ entry ] ) => {
				setIsAddFieldsVisible( entry.isIntersecting );
			},
			{ threshold: 0.1 }
		);

		observer.observe( node );
		return () => observer.disconnect();
	}, [] );

	// Close FAB popover when clicking outside
	useEffect( () => {
		if ( ! fabOpen ) {
			return;
		}
		const handleClick = ( e: MouseEvent ) => {
			const target = e.target as HTMLElement;
			if (
				! target.closest( '#ob-fab-popover' ) &&
				! target.closest( '#ob-fab-button' )
			) {
				setFabOpen( false );
			}
		};
		document.addEventListener( 'mousedown', handleClick );
		return () => document.removeEventListener( 'mousedown', handleClick );
	}, [ fabOpen ] );

	return (
		<div className="wpab-wpoa-w-full lg:wpab-wpoa-w-[520px] wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-gap-5 lg:wpab-wpoa-sticky lg:wpab-wpoa-top-[78px] lg:wpab-wpoa-self-start lg:wpab-wpoa-max-h-[calc(100vh-132px)] lg:wpab-wpoa-overflow-auto lg:wpab-wpoa-pr-[4px] wpab-wpoa-z-[10]">
			{ /* Add Field Section */ }
			<div
				ref={ addFieldsRef }
				className="wpab-wpoa-bg-white wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] wpab-wpoa-rounded-[8px] lg:wpab-wpoa-sticky lg:wpab-wpoa-top-[78px] "
			>
				<div className="wpab-wpoa-px-[15px] wpab-wpoa-py-[12px] wpab-wpoa-bg-[#f8f9fa] wpab-wpoa-border-b wpab-wpoa-border-[#e5e7eb] wpab-wpoa-font-semibold wpab-wpoa-text-[14px] wpab-wpoa-rounded-t-[8px] wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-gap-2">
					<CirclePlus className="wpab-wpoa-size-4 wpab-wpoa-text-[#2271b1]" />
					{ __( 'Add Fields', 'optionbay-product-options-addons-woo' ) }
				</div>
				<div className="wpab-wpoa-p-[15px]">
					<div className="wpab-wpoa-grid wpab-wpoa-grid-cols-2 wpab-wpoa-gap-2">
						{ FIELD_TYPES.map( ( ft ) => (
							<ClassicButton
								key={ ft.value }
								variant="secondary"
								onClick={ () => addField( ft.value ) }
								className="!wpab-wpoa-justify-center !wpab-wpoa-py-4 !wpab-wpoa-px-2 !wpab-wpoa-h-auto !wpab-wpoa-text-[13px] !wpab-wpoa-gap-2 !wpab-wpoa-flex !wpab-wpoa-text-[#2271b1] !wpab-wpoa-border-[#2271b1] hover:!wpab-wpoa-text-[#135e96] hover:!wpab-wpoa-bg-[#f6f7f7] !wpab-wpoa-rounded-[3px] !wpab-wpoa-font-medium"
							>
								<span className="wpab-wpoa-flex wpab-wpoa-flex-col wpab-wpoa-justify-center wpab-wpoa-items-center">
									{ FIELD_TYPE_ICONS[ ft.value ] &&
										React.createElement(
											FIELD_TYPE_ICONS[ ft.value ],
											{
												className:
													'wpab-wpoa-size-5 wpab-wpoa-shrink-0',
											}
										) }
									<span>{ ft.label }</span>
								</span>
							</ClassicButton>
						) ) }
					</div>
				</div>
			</div>

			{ /* Floating Action Button — shown when Add Fields card is out of view */ }
			{ ! isAddFieldsVisible && (
				<div
					className="lg:wpab-wpoa-hidden"
					style={ {
						position: 'fixed',
						bottom: '32px',
						right: '32px',
						zIndex: 99999,
					} }
				>
					{ /* Popover */ }
					{ fabOpen && (
						<div
							id="ob-fab-popover"
							className="wpab-wpoa-bg-white wpab-wpoa-border wpab-wpoa-border-[#c3c4c7] wpab-wpoa-rounded-[8px] wpab-wpoa-mb-3"
							style={ {
								boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
								width: '450px',
								animation: 'ob-fab-slide-up 0.2s ease-out',
							} }
						>
							<div className="wpab-wpoa-px-[12px] wpab-wpoa-py-[10px] wpab-wpoa-bg-[#f8f9fa] wpab-wpoa-border-b wpab-wpoa-border-[#e5e7eb] wpab-wpoa-font-semibold wpab-wpoa-text-[13px] wpab-wpoa-rounded-t-[8px] wpab-wpoa-flex wpab-wpoa-items-center wpab-wpoa-justify-between">
								<span>{ __( 'Add Field', 'optionbay-product-options-addons-woo' ) }</span>
								<button
									type="button"
									onClick={ () => setFabOpen( false ) }
									className="wpab-wpoa-bg-transparent wpab-wpoa-border-none wpab-wpoa-cursor-pointer wpab-wpoa-p-0 wpab-wpoa-text-[#666] hover:wpab-wpoa-text-[#1d2327]"
								>
									<X className="wpab-wpoa-size-4" />
								</button>
							</div>
							<div className="wpab-wpoa-p-[12px]">
								<div className="wpab-wpoa-grid wpab-wpoa-grid-cols-2 wpab-wpoa-gap-2">
									{ FIELD_TYPES.map( ( ft ) => (
										<ClassicButton
											key={ ft.value }
											variant="secondary"
											onClick={ () =>
												addField( ft.value )
											}
											className="!wpab-wpoa-justify-center !wpab-wpoa-text-center !wpab-wpoa-py-4 !wpab-wpoa-px-2 !wpab-wpoa-h-auto !wpab-wpoa-text-[13px] !wpab-wpoa-gap-2 !wpab-wpoa-flex !wpab-wpoa-flex-col !wpab-wpoa-items-center !wpab-wpoa-text-[#2271b1] !wpab-wpoa-border-[#2271b1] hover:!wpab-wpoa-text-[#135e96] hover:!wpab-wpoa-bg-[#f6f7f7] !wpab-wpoa-rounded-[3px] !wpab-wpoa-font-medium"
										>
											{ FIELD_TYPE_ICONS[ ft.value ] &&
												React.createElement(
													FIELD_TYPE_ICONS[
														ft.value
													],
													{
														className:
															'wpab-wpoa-size-5 wpab-wpoa-shrink-0',
													}
												) }
											<span>+ { ft.label }</span>
										</ClassicButton>
									) ) }
								</div>
							</div>
						</div>
					) }

					{ /* FAB Button */ }
					<button
						id="ob-fab-button"
						type="button"
						onClick={ () => setFabOpen( ( prev ) => ! prev ) }
						title={ __( 'Add Field', 'optionbay-product-options-addons-woo' ) }
						style={ {
							width: '48px',
							height: '48px',
							borderRadius: '50%',
							border: 'none',
							background: '#2271b1',
							color: '#fff',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
							transition:
								'transform 0.2s ease, background 0.2s ease',
							transform: fabOpen
								? 'rotate(45deg)'
								: 'rotate(0deg)',
							marginLeft: 'auto',
						} }
						onMouseEnter={ ( e ) =>
							( e.currentTarget.style.background = '#135e96' )
						}
						onMouseLeave={ ( e ) =>
							( e.currentTarget.style.background = '#2271b1' )
						}
					>
						<Plus style={ { width: '24px', height: '24px' } } />
					</button>
				</div>
			) }

			{ /* Keyframe animation for the popover slide-up */ }
			<style>{ `
        @keyframes ob-fab-slide-up {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      ` }</style>
		</div>
	);
};
