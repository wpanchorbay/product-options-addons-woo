import React, {
	useState,
	useRef,
	useEffect,
	KeyboardEvent,
	useMemo,
} from 'react';
import { ChevronDown, X, Lock, Hourglass } from 'lucide-react';
import { MultiSelectOption } from '../../utils/types';
import apiFetch from '@wordpress/api-fetch';

// Hook for click outside
function useClickOutside(
	ref: React.RefObject< HTMLElement >,
	handler: ( event: MouseEvent | TouchEvent ) => void
) {
	useEffect( () => {
		const listener = ( event: MouseEvent | TouchEvent ) => {
			if (
				! ref.current ||
				ref.current.contains( event.target as Node )
			) {
				return;
			}
			handler( event );
		};
		document.addEventListener( 'mousedown', listener );
		document.addEventListener( 'touchstart', listener );
		return () => {
			document.removeEventListener( 'mousedown', listener );
			document.removeEventListener( 'touchstart', listener );
		};
	}, [ ref, handler ] );
}

interface ClassicMultiSelectProps {
	id?: string;
	value: ( string | number )[];
	onChange: ( value: ( string | number )[] ) => void;
	options?: MultiSelectOption[];
	endpoint?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	label?: string | React.ReactNode;
	enableSearch?: boolean;
	size?: 'short' | 'regular';
	renderOption?: ( option: MultiSelectOption ) => React.ReactNode;
	description?: string;
	differentDropdownWidth?: boolean;
	isError?: boolean;
}

export const ClassicMultiSelect: React.FC< ClassicMultiSelectProps > = ( {
	id,
	value,
	onChange,
	options = [],
	endpoint,
	placeholder = 'Select options...',
	disabled = false,
	className = '',
	label,
	enableSearch = true,
	size = 'short',
	renderOption,
	description,
	differentDropdownWidth = false,
	isError = false,
} ) => {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ highlightedIndex, setHighlightedIndex ] = useState< number >( -1 );
	const [ searchQuery, setSearchQuery ] = useState( '' );
	const [ apiOptions, setApiOptions ] = useState< MultiSelectOption[] >( [] );
	const [ allSeenOptions, setAllSeenOptions ] = useState<
		MultiSelectOption[]
	>( options || [] );
	const [ isLoading, setIsLoading ] = useState( false );
	const initialFetchDone = useRef( false );

	const containerRef = useRef< HTMLDivElement >( null );
	const listRef = useRef< HTMLUListElement >( null );
	const searchInputRef = useRef< HTMLInputElement >( null );
	const interactionType = useRef< 'mouse' | 'keyboard' >( 'keyboard' );

	const [ tooltipState, setTooltipState ] = useState< {
		visible: boolean;
		top: number;
		left: number;
		text: string;
	} | null >( null );
	const hoverTimeoutRef = useRef< number | null >( null );

	useClickOutside( containerRef, () => {
		setIsOpen( false );
		setSearchQuery( '' );
		setTooltipState( null );
	} );

	// Merge fetched options into allSeenOptions so selected items keep their labels
	useEffect( () => {
		if ( apiOptions.length > 0 ) {
			setAllSeenOptions( ( prev ) => {
				const map = new Map( prev.map( ( o ) => [ o.value, o ] ) );
				apiOptions.forEach( ( o ) => map.set( o.value, o ) );
				return Array.from( map.values() );
			} );
		}
	}, [ apiOptions ] );

	// Initial fetch when component mounts with pre-selected values
	// Uses the `ids` parameter so the API returns exactly these items
	useEffect( () => {
		if ( ! endpoint || initialFetchDone.current || value.length === 0 ) {
			return;
		}
		initialFetchDone.current = true;

		const separator = endpoint.includes( '?' ) ? '&' : '?';
		const path = `${ endpoint }${ separator }ids=${ value.join( ',' ) }`;

		apiFetch( { path, method: 'GET' } )
			.then( ( res: any ) => {
				const data = res?.data || res || [];
				setAllSeenOptions( ( prev ) => {
					const map = new Map( prev.map( ( o ) => [ o.value, o ] ) );
					data.forEach( ( o: MultiSelectOption ) =>
						map.set( o.value, o )
					);
					return Array.from( map.values() );
				} );
			} )
			.catch( () => {} );
	}, [ endpoint, value ] );

	const effectiveOptions = endpoint ? apiOptions : options;

	useEffect( () => {
		if ( ! endpoint ) {
			return;
		}
		if ( ! isOpen ) {
			return;
		} // Only fetch when opened

		let active = true;
		const delayDebounceFn = setTimeout( async () => {
			try {
				setIsLoading( true );
				const separator = endpoint.includes( '?' ) ? '&' : '?';
				const path = `${ endpoint }${ separator }search=${ encodeURIComponent(
					searchQuery
				) }`;

				const res: any = await apiFetch( { path, method: 'GET' } );

				if ( active ) {
					setApiOptions( res?.data || res || [] );
					setIsLoading( false );
				}
			} catch {
				if ( active ) {
					setIsLoading( false );
				}
			}
		}, 300 );

		return () => {
			active = false;
			clearTimeout( delayDebounceFn );
		};
	}, [ endpoint, searchQuery, isOpen ] );

	const filteredOptions = useMemo( () => {
		if ( endpoint ) {
			return effectiveOptions;
		}
		if ( ! enableSearch || ! searchQuery ) {
			return effectiveOptions;
		}
		return effectiveOptions.filter( ( opt ) =>
			opt.label.toLowerCase().includes( searchQuery.toLowerCase() )
		);
	}, [ effectiveOptions, searchQuery, enableSearch, endpoint ] );

	// Selected values — use allSeenOptions for endpoint mode so labels persist
	const selectedOptions = useMemo( () => {
		const lookupSource = endpoint ? allSeenOptions : effectiveOptions;
		return value.map( ( v ) => {
			const found = lookupSource.find( ( opt ) => opt.value === v );
			return found || { value: v, label: `${ v }` };
		} );
	}, [ effectiveOptions, allSeenOptions, value, endpoint ] );

	useEffect( () => {
		if ( isOpen ) {
			if ( enableSearch && searchInputRef.current ) {
				requestAnimationFrame( () => searchInputRef.current?.focus() );
			}
			setHighlightedIndex( 0 );
			interactionType.current = 'keyboard';
		} else {
			setSearchQuery( '' );
			setTooltipState( null );
		}
	}, [ isOpen, enableSearch, filteredOptions.length ] );

	useEffect( () => {
		if (
			isOpen &&
			listRef.current &&
			highlightedIndex >= 0 &&
			interactionType.current === 'keyboard'
		) {
			const list = listRef.current;
			const element = list.children[ highlightedIndex ] as HTMLElement;
			if ( element ) {
				const listTop = list.scrollTop;
				const listBottom = listTop + list.clientHeight;
				const elementTop = element.offsetTop;
				const elementBottom = elementTop + element.offsetHeight;
				if ( elementTop < listTop ) {
					list.scrollTop = elementTop;
				} else if ( elementBottom > listBottom ) {
					list.scrollTop = elementBottom - list.clientHeight;
				}
			}
		}
	}, [ highlightedIndex, isOpen ] );

	const handleSelect = ( option: MultiSelectOption ) => {
		// @ts-ignore - sharing variant types from Select for consistency
		const variant = option.variant;
		if (
			option.disabled ||
			variant === 'buy_pro' ||
			variant === 'coming_soon'
		) {
			return;
		}

		if ( value.includes( option.value ) ) {
			onChange( value.filter( ( v ) => v !== option.value ) );
		} else {
			onChange( [ ...value, option.value ] );
		}

		if ( searchInputRef.current ) {
			searchInputRef.current.focus();
		}
	};

	const handleRemove = (
		e: React.MouseEvent,
		valToRemove: string | number
	) => {
		e.stopPropagation();
		onChange( value.filter( ( v ) => v !== valToRemove ) );
	};

	const handleTriggerKeyDown = ( e: KeyboardEvent< HTMLDivElement > ) => {
		if ( disabled ) {
			return;
		}
		if ( isOpen && enableSearch ) {
			return;
		}

		interactionType.current = 'keyboard';
		switch ( e.key ) {
			case 'Enter':
			case ' ':
				e.preventDefault();
				setIsOpen( ! isOpen );
				break;
			case 'ArrowDown':
				e.preventDefault();
				if ( ! isOpen ) {
					setIsOpen( true );
				} else {
					setHighlightedIndex( ( prev ) =>
						prev < filteredOptions.length - 1 ? prev + 1 : 0
					);
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if ( ! isOpen ) {
					setIsOpen( true );
				} else {
					setHighlightedIndex( ( prev ) =>
						prev > 0 ? prev - 1 : filteredOptions.length - 1
					);
				}
				break;
			case 'Escape':
				if ( isOpen ) {
					e.preventDefault();
					setIsOpen( false );
				}
				break;
		}
	};

	const handleSearchKeyDown = ( e: KeyboardEvent< HTMLInputElement > ) => {
		interactionType.current = 'keyboard';
		switch ( e.key ) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightedIndex( ( prev ) =>
					prev < filteredOptions.length - 1 ? prev + 1 : 0
				);
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightedIndex( ( prev ) =>
					prev > 0 ? prev - 1 : filteredOptions.length - 1
				);
				break;
			case 'Enter':
				e.preventDefault();
				if ( filteredOptions[ highlightedIndex ] ) {
					handleSelect( filteredOptions[ highlightedIndex ] );
				}
				break;
			case 'Backspace':
				if ( ! searchQuery && value.length > 0 ) {
					onChange( value.slice( 0, -1 ) );
				}
				break;
			case 'Escape':
				e.preventDefault();
				setIsOpen( false );
				break;
		}
	};

	const selectId = useMemo(
		() => id || `classic-multi-${ Math.random().toString( 36 ).slice( 2, 9 ) }`,
		[ id ]
	);
	const sizeClass = size === 'short' ? '' : '';
	const explicitWidth =
		size === 'short' ? 'min-content' : size === 'regular' ? 'auto' : '100%';

	return (
		<div
			className={ `${ sizeClass } ${ className } spoa-align-middle` }
			ref={ containerRef }
		>
			{ label && (
				<label
					htmlFor={ selectId }
					className="spoa-block spoa-mb-1"
				>
					{ label }
				</label>
			) }

			<div
				className="spoa-relative"
				style={ { width: explicitWidth } }
			>
				<div
					id={ selectId }
					tabIndex={ disabled ? -1 : 0 }
					role="combobox"
					aria-expanded={ isOpen }
					onClick={ ( e ) => {
						if ( disabled ) {
							return;
						}
						// Don't toggle closed if clicking inside the search input while already open
						if (
							isOpen &&
							( e.target as HTMLElement ).tagName === 'INPUT'
						) {
							return;
						}
						setIsOpen( ! isOpen );
					} }
					onKeyDown={ handleTriggerKeyDown }
					className={ `spoa-flex spoa-flex-wrap spoa-items-center spoa-gap-1 spoa-bg-white spoa-border spoa-border-[#8c8f94] spoa-rounded-[3px] spoa-p-[3px_24px_3px_6px] spoa-min-h-[30px] spoa-transition-shadow spoa-duration-100 spoa-relative spoa-box-border spoa-w-full ${
						disabled
							? 'spoa-cursor-not-allowed spoa-bg-[#f0f0f1]'
							: 'spoa-cursor-text'
					} ${
						isOpen
							? 'spoa-border-[#2271b1] spoa-shadow-[0_0_0_1px_#2271b1]'
							: 'spoa-shadow-none'
					} ${
						isError && ! isOpen
							? '!spoa-border-red-400 !spoa-shadow-none'
							: ''
					}` }
				>
					{ selectedOptions.map( ( opt ) => (
						<span
							key={ opt.value }
							className="spoa-bg-[#f0f0f1] spoa-border spoa-border-[#c3c4c7] spoa-rounded-[3px] spoa-px-1 spoa-flex spoa-items-center spoa-gap-1 spoa-text-xs spoa-text-[#3c434a] spoa-leading-[20px]"
						>
							{ opt.label }
							<button
								onClick={ ( e ) =>
									handleRemove( e, opt.value )
								}
								className="spoa-bg-transparent spoa-border-none spoa-p-0 spoa-cursor-pointer spoa-text-[#8c8f94] spoa-flex spoa-items-center"
							>
								<X size={ 12 } />
							</button>
						</span>
					) ) }

					{ ! enableSearch && value.length === 0 && (
						<span className="spoa-text-[#8c8f94] spoa-text-[13px] spoa-pl-1">
							{ placeholder }
						</span>
					) }

					{ /* Chevron icon pointing down */ }
					<span className="spoa-absolute spoa-right-1.5 spoa-top-1/2 -spoa-translate-y-1/2 spoa-flex spoa-pointer-events-none">
						<ChevronDown size={ 14 } color="#50575e" />
					</span>
				</div>

				{ isOpen && (
					<div
						className="spoa-absolute spoa-z-[99999] spoa-bg-white spoa-border-2 spoa-border-[#2271b1] spoa-border-t-0  spoa-rounded-b-[3px] spoa-shadow-[0_3px_5px_rgba(0,0,0,0.2)] spoa-p-0 spoa-box-border spoa-top-full spoa-left-[-1px] spoa-mt-[-3px]"
						style={ {
							...( differentDropdownWidth
								? { minWidth: 'calc(100% + 2px)' }
								: { width: 'calc(100% + 2px)' } ),
						} }
					>
						{ enableSearch && (
							<input
								ref={ searchInputRef }
								type="text"
								value={ searchQuery }
								onFocus={ () => {
									if ( ! disabled && ! isOpen ) {
										setIsOpen( true );
									}
								} }
								onChange={ ( e ) => {
									setSearchQuery( e.target.value );
									if ( ! isOpen ) {
										setIsOpen( true );
									}
								} }
								onKeyDown={ handleSearchKeyDown }
								placeholder={
									value.length === 0 ? placeholder : ''
								}
								disabled={ disabled }
								className="spoa-w-[calc(100%-8px)] spoa-px-2 spoa-leading-loose spoa-min-h-[26px] spoa-border spoa-border-[#aaaaaa] spoa-bg-[#fcfcfc] spoa-rounded-[3px] spoa-box-border spoa-text-[13px] focus:spoa-outline-none focus:spoa-shadow-none spoa-m-[4px]"
							/>
						) }
						{ isLoading ? (
							<div className="spoa-py-2 spoa-px-3 spoa-text-[#646970] spoa-text-[13px] spoa-flex spoa-items-center spoa-gap-2">
								<Hourglass
									size={ 14 }
									className="spoa-animate-spin"
								/>{ ' ' }
								Loading...
							</div>
						) : (
							<ul
								ref={ listRef }
								role="listbox"
								className="spoa-max-h-[220px] spoa-overflow-y-auto spoa-m-0 spoa-p-0 spoa-list-none"
							>
								{ filteredOptions.length === 0 ? (
									<li className="spoa-px-3 spoa-py-1.5 spoa-text-[#646970] spoa-italic spoa-text-[13px] spoa-m-0">
										{ searchQuery
											? 'No results found'
											: 'No options available' }
									</li>
								) : (
									filteredOptions.map( ( opt, index ) => {
										const isSelected = value.includes(
											opt.value
										);
										const isHighlighted =
											highlightedIndex === index;
										// @ts-ignore
										const variant = opt.variant;
										const isPro = variant === 'buy_pro';
										const isComingSoon =
											variant === 'coming_soon';
										const isDisabled =
											opt.disabled ||
											isPro ||
											isComingSoon;

										return (
											<li
												key={ opt.value }
												role="option"
												aria-selected={ isSelected }
												onMouseEnter={ ( e ) => {
													interactionType.current =
														'mouse';
													setHighlightedIndex(
														index
													);
													if (
														isPro ||
														isComingSoon
													) {
														const rect =
															e.currentTarget.getBoundingClientRect();
														setTooltipState( {
															visible: true,
															top: rect.top,
															left:
																rect.left +
																rect.width / 2,
															text: isPro
																? 'Available in Pro'
																: 'Coming Soon',
														} );
													} else {
														setTooltipState( null );
													}
												} }
												onMouseLeave={ () =>
													setTooltipState( null )
												}
												onClick={ ( e ) => {
													e.stopPropagation();
													handleSelect( opt );
												} }
												className={ `spoa-px-3 spoa-py-1.5 spoa-flex spoa-items-center spoa-justify-between spoa-text-[13px] spoa-m-0 ${
													isDisabled
														? 'spoa-cursor-not-allowed'
														: 'spoa-cursor-pointer'
												} ${
													isHighlighted
														? 'spoa-bg-[#2271b1] spoa-text-white'
														: isDisabled
														? 'spoa-bg-transparent spoa-text-[#a7aaad]'
														: 'spoa-bg-transparent spoa-text-[#2c3338]'
												}` }
											>
												<div className="spoa-flex spoa-items-center spoa-gap-2">
													<div
														className={ `
                            spoa-flex spoa-items-center spoa-justify-center
                            spoa-w-4 spoa-h-4 spoa-rounded spoa-border-2 spoa-transition-all spoa-duration-200
                            ${
								isSelected
									? isHighlighted
										? 'spoa-border-white spoa-bg-white'
										: 'spoa-border-[#2271b1] spoa-bg-[#2271b1]'
									: isHighlighted
									? 'spoa-border-white spoa-bg-transparent'
									: 'spoa-border-[#8c8f94] spoa-bg-white'
							}
                          ` }
													>
														<svg
															className={ `spoa-w-3.5 spoa-h-3.5 spoa-transform spoa-transition-transform spoa-duration-200 ${
																isSelected
																	? 'spoa-scale-100'
																	: 'spoa-scale-0'
															} ${
																isHighlighted &&
																isSelected
																	? 'spoa-text-[#2271b1]'
																	: 'spoa-text-white'
															}` }
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="3"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<polyline points="20 6 9 17 4 12"></polyline>
														</svg>
													</div>
													<span>
														{ renderOption
															? renderOption(
																	opt
															  )
															: opt.label }
													</span>
												</div>

												{ /* Icons for variants */ }
												{ isPro && (
													<span
														className={ `spoa-flex ${
															isHighlighted
																? 'spoa-text-white'
																: 'spoa-text-[#ffb900]'
														}` }
													>
														<Lock size={ 14 } />
													</span>
												) }
												{ isComingSoon && (
													<span
														className={ `spoa-text-[10px] spoa-uppercase spoa-px-1.5 spoa-py-0.5 spoa-rounded-[10px] spoa-font-semibold spoa-flex spoa-items-center spoa-gap-1 ${
															isHighlighted
																? 'spoa-bg-white/20 spoa-text-white'
																: 'spoa-bg-[#f0f0f1] spoa-text-[#646970]'
														}` }
													>
														<Hourglass
															size={ 10 }
														/>
														Soon
													</span>
												) }
											</li>
										);
									} )
								) }
							</ul>
						) }
					</div>
				) }
			</div>

			{ description && (
				<p className="description spoa-mt-1">{ description }</p>
			) }

			{ tooltipState?.visible && (
				<div
					className="spoa-fixed spoa-bg-[#1d2327] spoa-text-white spoa-px-2.5 spoa-py-1 spoa-rounded-[3px] spoa-text-[12px] spoa-pointer-events-none spoa-z-[100000] spoa-whitespace-nowrap"
					style={ {
						top: tooltipState.top - 8,
						left: tooltipState.left,
						transform: 'translate(-50%, -100%)',
					} }
				>
					{ tooltipState.text }
					<div className="spoa-absolute -spoa-bottom-1 spoa-left-1/2 -spoa-translate-x-1/2 spoa-border-x-4 spoa-border-t-4 spoa-border-x-transparent spoa-border-b-transparent spoa-border-t-[#1d2327]" />
				</div>
			) }
		</div>
	);
};
