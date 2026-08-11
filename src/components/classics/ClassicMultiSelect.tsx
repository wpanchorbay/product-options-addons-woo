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
			className={ `${ sizeClass } ${ className } opopw-align-middle` }
			ref={ containerRef }
		>
			{ label && (
				<label
					htmlFor={ selectId }
					className="opopw-block opopw-mb-1"
				>
					{ label }
				</label>
			) }

			<div
				className="opopw-relative"
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
					className={ `opopw-flex opopw-flex-wrap opopw-items-center opopw-gap-1 opopw-bg-white opopw-border opopw-border-[#8c8f94] opopw-rounded-[3px] opopw-p-[3px_24px_3px_6px] opopw-min-h-[30px] opopw-transition-shadow opopw-duration-100 opopw-relative opopw-box-border opopw-w-full ${
						disabled
							? 'opopw-cursor-not-allowed opopw-bg-[#f0f0f1]'
							: 'opopw-cursor-text'
					} ${
						isOpen
							? 'opopw-border-[#2271b1] opopw-shadow-[0_0_0_1px_#2271b1]'
							: 'opopw-shadow-none'
					} ${
						isError && ! isOpen
							? '!opopw-border-red-400 !opopw-shadow-none'
							: ''
					}` }
				>
					{ selectedOptions.map( ( opt ) => (
						<span
							key={ opt.value }
							className="opopw-bg-[#f0f0f1] opopw-border opopw-border-[#c3c4c7] opopw-rounded-[3px] opopw-px-1 opopw-flex opopw-items-center opopw-gap-1 opopw-text-xs opopw-text-[#3c434a] opopw-leading-[20px]"
						>
							{ opt.label }
							<button
								onClick={ ( e ) =>
									handleRemove( e, opt.value )
								}
								className="opopw-bg-transparent opopw-border-none opopw-p-0 opopw-cursor-pointer opopw-text-[#8c8f94] opopw-flex opopw-items-center"
							>
								<X size={ 12 } />
							</button>
						</span>
					) ) }

					{ ! enableSearch && value.length === 0 && (
						<span className="opopw-text-[#8c8f94] opopw-text-[13px] opopw-pl-1">
							{ placeholder }
						</span>
					) }

					{ /* Chevron icon pointing down */ }
					<span className="opopw-absolute opopw-right-1.5 opopw-top-1/2 -opopw-translate-y-1/2 opopw-flex opopw-pointer-events-none">
						<ChevronDown size={ 14 } color="#50575e" />
					</span>
				</div>

				{ isOpen && (
					<div
						className="opopw-absolute opopw-z-[99999] opopw-bg-white opopw-border-2 opopw-border-[#2271b1] opopw-border-t-0  opopw-rounded-b-[3px] opopw-shadow-[0_3px_5px_rgba(0,0,0,0.2)] opopw-p-0 opopw-box-border opopw-top-full opopw-left-[-1px] opopw-mt-[-3px]"
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
								className="opopw-w-[calc(100%-8px)] opopw-px-2 opopw-leading-loose opopw-min-h-[26px] opopw-border opopw-border-[#aaaaaa] opopw-bg-[#fcfcfc] opopw-rounded-[3px] opopw-box-border opopw-text-[13px] focus:opopw-outline-none focus:opopw-shadow-none opopw-m-[4px]"
							/>
						) }
						{ isLoading ? (
							<div className="opopw-py-2 opopw-px-3 opopw-text-[#646970] opopw-text-[13px] opopw-flex opopw-items-center opopw-gap-2">
								<Hourglass
									size={ 14 }
									className="opopw-animate-spin"
								/>{ ' ' }
								Loading...
							</div>
						) : (
							<ul
								ref={ listRef }
								role="listbox"
								className="opopw-max-h-[220px] opopw-overflow-y-auto opopw-m-0 opopw-p-0 opopw-list-none"
							>
								{ filteredOptions.length === 0 ? (
									<li className="opopw-px-3 opopw-py-1.5 opopw-text-[#646970] opopw-italic opopw-text-[13px] opopw-m-0">
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
												className={ `opopw-px-3 opopw-py-1.5 opopw-flex opopw-items-center opopw-justify-between opopw-text-[13px] opopw-m-0 ${
													isDisabled
														? 'opopw-cursor-not-allowed'
														: 'opopw-cursor-pointer'
												} ${
													isHighlighted
														? 'opopw-bg-[#2271b1] opopw-text-white'
														: isDisabled
														? 'opopw-bg-transparent opopw-text-[#a7aaad]'
														: 'opopw-bg-transparent opopw-text-[#2c3338]'
												}` }
											>
												<div className="opopw-flex opopw-items-center opopw-gap-2">
													<div
														className={ `
                            opopw-flex opopw-items-center opopw-justify-center
                            opopw-w-4 opopw-h-4 opopw-rounded opopw-border-2 opopw-transition-all opopw-duration-200
                            ${
								isSelected
									? isHighlighted
										? 'opopw-border-white opopw-bg-white'
										: 'opopw-border-[#2271b1] opopw-bg-[#2271b1]'
									: isHighlighted
									? 'opopw-border-white opopw-bg-transparent'
									: 'opopw-border-[#8c8f94] opopw-bg-white'
							}
                          ` }
													>
														<svg
															className={ `opopw-w-3.5 opopw-h-3.5 opopw-transform opopw-transition-transform opopw-duration-200 ${
																isSelected
																	? 'opopw-scale-100'
																	: 'opopw-scale-0'
															} ${
																isHighlighted &&
																isSelected
																	? 'opopw-text-[#2271b1]'
																	: 'opopw-text-white'
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
														className={ `opopw-flex ${
															isHighlighted
																? 'opopw-text-white'
																: 'opopw-text-[#ffb900]'
														}` }
													>
														<Lock size={ 14 } />
													</span>
												) }
												{ isComingSoon && (
													<span
														className={ `opopw-text-[10px] opopw-uppercase opopw-px-1.5 opopw-py-0.5 opopw-rounded-[10px] opopw-font-semibold opopw-flex opopw-items-center opopw-gap-1 ${
															isHighlighted
																? 'opopw-bg-white/20 opopw-text-white'
																: 'opopw-bg-[#f0f0f1] opopw-text-[#646970]'
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
				<p className="description opopw-mt-1">{ description }</p>
			) }

			{ tooltipState?.visible && (
				<div
					className="opopw-fixed opopw-bg-[#1d2327] opopw-text-white opopw-px-2.5 opopw-py-1 opopw-rounded-[3px] opopw-text-[12px] opopw-pointer-events-none opopw-z-[100000] opopw-whitespace-nowrap"
					style={ {
						top: tooltipState.top - 8,
						left: tooltipState.left,
						transform: 'translate(-50%, -100%)',
					} }
				>
					{ tooltipState.text }
					<div className="opopw-absolute -opopw-bottom-1 opopw-left-1/2 -opopw-translate-x-1/2 opopw-border-x-4 opopw-border-t-4 opopw-border-x-transparent opopw-border-b-transparent opopw-border-t-[#1d2327]" />
				</div>
			) }
		</div>
	);
};
