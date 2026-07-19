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
				! target.closest( '#opopw-fab-popover' ) &&
				! target.closest( '#opopw-fab-button' )
			) {
				setFabOpen( false );
			}
		};
		document.addEventListener( 'mousedown', handleClick );
		return () => document.removeEventListener( 'mousedown', handleClick );
	}, [ fabOpen ] );

	return (
		<div className="opopw-w-full lg:opopw-w-[520px] opopw-flex opopw-flex-col opopw-gap-5 lg:opopw-sticky lg:opopw-top-[78px] lg:opopw-self-start lg:opopw-max-h-[calc(100vh-132px)] lg:opopw-overflow-auto lg:opopw-pr-[4px] opopw-z-[10]">
			{ /* Add Field Section */ }
			<div
				ref={ addFieldsRef }
				className="opopw-bg-white opopw-border opopw-border-[#c3c4c7] opopw-rounded-[8px] lg:opopw-sticky lg:opopw-top-[78px] "
			>
				<div className="opopw-px-[15px] opopw-py-[12px] opopw-bg-[#f8f9fa] opopw-border-b opopw-border-[#e5e7eb] opopw-font-semibold opopw-text-[14px] opopw-rounded-t-[8px] opopw-flex opopw-items-center opopw-gap-2">
					<CirclePlus className="opopw-size-4 opopw-text-[#2271b1]" />
					{ __( 'Add Fields', 'optionbay-product-options-addons-woo' ) }
				</div>
				<div className="opopw-p-[15px]">
					<div className="opopw-grid opopw-grid-cols-2 opopw-gap-2">
						{ FIELD_TYPES.map( ( ft ) => (
							<ClassicButton
								key={ ft.value }
								variant="secondary"
								onClick={ () => addField( ft.value ) }
								className="!opopw-justify-center !opopw-py-4 !opopw-px-2 !opopw-h-auto !opopw-text-[13px] !opopw-gap-2 !opopw-flex !opopw-text-[#2271b1] !opopw-border-[#2271b1] hover:!opopw-text-[#135e96] hover:!opopw-bg-[#f6f7f7] !opopw-rounded-[3px] !opopw-font-medium"
							>
								<span className="opopw-flex opopw-flex-col opopw-justify-center opopw-items-center">
									{ FIELD_TYPE_ICONS[ ft.value ] &&
										React.createElement(
											FIELD_TYPE_ICONS[ ft.value ],
											{
												className:
													'opopw-size-5 opopw-shrink-0',
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
					className="lg:opopw-hidden"
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
							id="opopw-fab-popover"
							className="opopw-bg-white opopw-border opopw-border-[#c3c4c7] opopw-rounded-[8px] opopw-mb-3"
							style={ {
								boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
								width: '450px',
								animation: 'opopw-fab-slide-up 0.2s ease-out',
							} }
						>
							<div className="opopw-px-[12px] opopw-py-[10px] opopw-bg-[#f8f9fa] opopw-border-b opopw-border-[#e5e7eb] opopw-font-semibold opopw-text-[13px] opopw-rounded-t-[8px] opopw-flex opopw-items-center opopw-justify-between">
								<span>{ __( 'Add Field', 'optionbay-product-options-addons-woo' ) }</span>
								<button
									type="button"
									onClick={ () => setFabOpen( false ) }
									className="opopw-bg-transparent opopw-border-none opopw-cursor-pointer opopw-p-0 opopw-text-[#666] hover:opopw-text-[#1d2327]"
								>
									<X className="opopw-size-4" />
								</button>
							</div>
							<div className="opopw-p-[12px]">
								<div className="opopw-grid opopw-grid-cols-2 opopw-gap-2">
									{ FIELD_TYPES.map( ( ft ) => (
										<ClassicButton
											key={ ft.value }
											variant="secondary"
											onClick={ () =>
												addField( ft.value )
											}
											className="!opopw-justify-center !opopw-text-center !opopw-py-4 !opopw-px-2 !opopw-h-auto !opopw-text-[13px] !opopw-gap-2 !opopw-flex !opopw-flex-col !opopw-items-center !opopw-text-[#2271b1] !opopw-border-[#2271b1] hover:!opopw-text-[#135e96] hover:!opopw-bg-[#f6f7f7] !opopw-rounded-[3px] !opopw-font-medium"
										>
											{ FIELD_TYPE_ICONS[ ft.value ] &&
												React.createElement(
													FIELD_TYPE_ICONS[
														ft.value
													],
													{
														className:
															'opopw-size-5 opopw-shrink-0',
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
						id="opopw-fab-button"
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
        @keyframes opopw-fab-slide-up {
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
