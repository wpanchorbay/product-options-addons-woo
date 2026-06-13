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
		<div className="spoa-w-full lg:spoa-w-[520px] spoa-flex spoa-flex-col spoa-gap-5 lg:spoa-sticky lg:spoa-top-[78px] lg:spoa-self-start lg:spoa-max-h-[calc(100vh-132px)] lg:spoa-overflow-auto lg:spoa-pr-[4px] spoa-z-[10]">
			{ /* Add Field Section */ }
			<div
				ref={ addFieldsRef }
				className="spoa-bg-white spoa-border spoa-border-[#c3c4c7] spoa-rounded-[8px] lg:spoa-sticky lg:spoa-top-[78px] "
			>
				<div className="spoa-px-[15px] spoa-py-[12px] spoa-bg-[#f8f9fa] spoa-border-b spoa-border-[#e5e7eb] spoa-font-semibold spoa-text-[14px] spoa-rounded-t-[8px] spoa-flex spoa-items-center spoa-gap-2">
					<CirclePlus className="spoa-size-4 spoa-text-[#2271b1]" />
					{ __( 'Add Fields', 'smart-product-options-addons' ) }
				</div>
				<div className="spoa-p-[15px]">
					<div className="spoa-grid spoa-grid-cols-2 spoa-gap-2">
						{ FIELD_TYPES.map( ( ft ) => (
							<ClassicButton
								key={ ft.value }
								variant="secondary"
								onClick={ () => addField( ft.value ) }
								className="!spoa-justify-center !spoa-py-4 !spoa-px-2 !spoa-h-auto !spoa-text-[13px] !spoa-gap-2 !spoa-flex !spoa-text-[#2271b1] !spoa-border-[#2271b1] hover:!spoa-text-[#135e96] hover:!spoa-bg-[#f6f7f7] !spoa-rounded-[3px] !spoa-font-medium"
							>
								<span className="spoa-flex spoa-flex-col spoa-justify-center spoa-items-center">
									{ FIELD_TYPE_ICONS[ ft.value ] &&
										React.createElement(
											FIELD_TYPE_ICONS[ ft.value ],
											{
												className:
													'spoa-size-5 spoa-shrink-0',
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
					className="lg:spoa-hidden"
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
							className="spoa-bg-white spoa-border spoa-border-[#c3c4c7] spoa-rounded-[8px] spoa-mb-3"
							style={ {
								boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
								width: '450px',
								animation: 'ob-fab-slide-up 0.2s ease-out',
							} }
						>
							<div className="spoa-px-[12px] spoa-py-[10px] spoa-bg-[#f8f9fa] spoa-border-b spoa-border-[#e5e7eb] spoa-font-semibold spoa-text-[13px] spoa-rounded-t-[8px] spoa-flex spoa-items-center spoa-justify-between">
								<span>{ __( 'Add Field', 'smart-product-options-addons' ) }</span>
								<button
									type="button"
									onClick={ () => setFabOpen( false ) }
									className="spoa-bg-transparent spoa-border-none spoa-cursor-pointer spoa-p-0 spoa-text-[#666] hover:spoa-text-[#1d2327]"
								>
									<X className="spoa-size-4" />
								</button>
							</div>
							<div className="spoa-p-[12px]">
								<div className="spoa-grid spoa-grid-cols-2 spoa-gap-2">
									{ FIELD_TYPES.map( ( ft ) => (
										<ClassicButton
											key={ ft.value }
											variant="secondary"
											onClick={ () =>
												addField( ft.value )
											}
											className="!spoa-justify-center !spoa-text-center !spoa-py-4 !spoa-px-2 !spoa-h-auto !spoa-text-[13px] !spoa-gap-2 !spoa-flex !spoa-flex-col !spoa-items-center !spoa-text-[#2271b1] !spoa-border-[#2271b1] hover:!spoa-text-[#135e96] hover:!spoa-bg-[#f6f7f7] !spoa-rounded-[3px] !spoa-font-medium"
										>
											{ FIELD_TYPE_ICONS[ ft.value ] &&
												React.createElement(
													FIELD_TYPE_ICONS[
														ft.value
													],
													{
														className:
															'spoa-size-5 spoa-shrink-0',
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
						title={ __( 'Add Field', 'smart-product-options-addons' ) }
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
