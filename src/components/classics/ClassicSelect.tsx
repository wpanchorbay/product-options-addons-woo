import React, {
	useState,
	useRef,
	useEffect,
	KeyboardEvent,
	useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Lock, Hourglass, X } from 'lucide-react';
import { SelectOption } from '../../utils/types';
import apiFetch from '@wordpress/api-fetch';

// Hook for click outside
function useClickOutside(
	refs: React.RefObject< HTMLElement >[],
	handler: ( event: MouseEvent | TouchEvent ) => void
) {
	useEffect( () => {
		const listener = ( event: MouseEvent | TouchEvent ) => {
			// If any ref contains the target, don't trigger handler
			const isInside = refs.some(
				( ref ) =>
					ref.current && ref.current.contains( event.target as Node )
			);
			if ( isInside ) {
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
	}, [ refs, handler ] );
}

export interface ClassicSelectClassNames {
	container?: string;
	label?: string;
	innerContainer?: string;
	trigger?: string;
	triggerOpen?: string;
	triggerDisabled?: string;
	value?: string;
	dropdown?: string;
	searchContainer?: string;
	searchInput?: string;
	list?: string;
	option?: string;
	optionHighlighted?: string;
	optionSelected?: string;
	description?: string;
}

interface ClassicSelectProps {
	id?: string;
	value: SelectOption[ 'value' ] | null;
	onChange: ( value: string | number ) => void;
	options: SelectOption[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	classNames?: ClassicSelectClassNames;
	label?: string;
	description?: string;
	enableSearch?: boolean;
	size?: 'short' | 'regular';
	renderOption?: ( option: SelectOption ) => React.ReactNode;
	differentDropdownWidth?: boolean;
	endpoint?: string;
	dropdownHeader?: React.ReactNode;
	dropdownFooter?: React.ReactNode;
	allowClear?: boolean;
	isError?: boolean;
}

export const ClassicSelect: React.FC< ClassicSelectProps > = ( {
	id,
	value,
	onChange,
	options,
	placeholder = 'Select an option...',
	disabled = false,
	className = '',
	classNames,
	label,
	description,
	enableSearch = false,
	size = 'short',
	renderOption,
	differentDropdownWidth = false,
	endpoint,
	dropdownHeader,
	dropdownFooter,
	allowClear = false,
	isError = false,
} ) => {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ highlightedIndex, setHighlightedIndex ] = useState< number >( -1 );
	const [ searchQuery, setSearchQuery ] = useState( '' );
	const [ apiOptions, setApiOptions ] = useState< SelectOption[] >( [] );
	const [ allSeenOptions, setAllSeenOptions ] = useState< SelectOption[] >(
		options || []
	);
	const [ isLoading, setIsLoading ] = useState( false );
	const initialFetchDone = useRef( false );

	const containerRef = useRef< HTMLDivElement >( null );
	const dropdownRef = useRef< HTMLDivElement >( null );
	const listRef = useRef< HTMLUListElement >( null );
	const searchInputRef = useRef< HTMLInputElement >( null );
	const interactionType = useRef< 'mouse' | 'keyboard' >( 'keyboard' );

	// Portal coordinates. The dropdown is `position: fixed`, so its on-screen
	// position never changes as the page scrolls unless these are explicitly
	// recalculated — openUpward flips it above the trigger when there isn't
	// enough room below, so a trigger far down a long page can never end up
	// with a dropdown permanently rendered past the bottom of the viewport
	// (unreachable by scrolling, since scrolling doesn't move fixed elements).
	const [ coords, setCoords ] = useState( {
		top: 0,
		bottom: 0,
		left: 0,
		width: 0,
		openUpward: false,
	} );

	// Tooltip state for buy_pro
	const [ tooltipState, setTooltipState ] = useState< {
		visible: boolean;
		top: number;
		left: number;
		width: number | 'max-content';
		text: string;
	} | null >( null );
	const hoverTimeoutRef = useRef< number | null >( null );

	useClickOutside( [ containerRef, dropdownRef ], () => {
		setIsOpen( false );
		setTooltipState( null );
	} );

	const selectedOption = useMemo( () => {
		const lookupSource = endpoint ? allSeenOptions : options;
		return lookupSource.find( ( opt ) => opt.value === value ) || null;
	}, [ options, allSeenOptions, value, endpoint ] );

	// Merge fetched options into allSeenOptions so selected items keep their labels
	useEffect( () => {
		if ( apiOptions.length > 0 ) {
			setAllSeenOptions( ( prev ) => {
				const map = new Map( prev.map( ( o ) => [ o.value, o ] ) );
				apiOptions.forEach( ( o: any ) => {
					// Normalize: ensure it has value and label
					const normalized = {
						...o,
						value: o.value !== undefined ? o.value : o.id,
						label: o.label !== undefined ? o.label : o.name || o.title || '',
					};
					map.set( normalized.value, normalized );
				} );
				return Array.from( map.values() );
			} );
		}
	}, [ apiOptions ] );

	// Merge parent options into allSeenOptions when options prop changes
	useEffect( () => {
		if ( options && options.length > 0 ) {
			setAllSeenOptions( ( prev ) => {
				const map = new Map( prev.map( ( o ) => [ o.value, o ] ) );
				options.forEach( ( o ) => map.set( o.value, o ) );
				return Array.from( map.values() );
			} );
		}
	}, [ options ] );

	// Initial fetch when component mounts with pre-selected value
	useEffect( () => {
		if (
			! endpoint ||
			initialFetchDone.current ||
			value === null ||
			value === undefined
		) {
			return;
		}
		initialFetchDone.current = true;

		const separator = endpoint.includes( '?' ) ? '&' : '?';
		// Use direct ID endpoint if possible, or fallback to ids= query
		const path = endpoint.includes( '%' ) || endpoint.includes( '?' ) 
			? `${ endpoint }${ separator }ids=${ value }`
			: `${ endpoint.replace( /\/+$/, '' ) }/${ value }`;

		apiFetch( { path, method: 'GET' } )
			.then( ( res: any ) => {
				const data = res?.data || res || [];
				const item = Array.isArray( data ) ? data[ 0 ] : data;
				if ( item ) {
					// Normalize single item
					const normalized = {
						...item,
						value: item.value !== undefined ? item.value : item.id,
						label: item.label !== undefined ? item.label : item.name || item.title || '',
					};

					setAllSeenOptions( ( prev ) => {
						const map = new Map(
							prev.map( ( o ) => [ o.value, o ] )
						);
						map.set( normalized.value, normalized );
						return Array.from( map.values() );
					} );
				}
			} )
			.catch( () => {} );
	}, [ endpoint, value ] );

	const effectiveOptions = useMemo( () => {
		if ( ! endpoint ) {
			return options;
		}
		const map = new Map( options.map( ( o ) => [ o.value, o ] ) );
		apiOptions.forEach( ( o ) => map.set( o.value, o ) );
		return Array.from( map.values() );
	}, [ options, apiOptions, endpoint ] );

	useEffect( () => {
		if ( ! endpoint || ! isOpen ) {
			return;
		}

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
					const data = res?.data || res || [];
					const normalizedData = Array.isArray( data ) 
						? data.map( ( o: any ) => ( {
							...o,
							value: o.value !== undefined ? o.value : o.id,
							label: o.label !== undefined ? o.label : o.name || o.title || '',
						} ) )
						: [];

					setApiOptions( normalizedData );
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

	// Estimated dropdown height (max-height on the option list, plus room for
	// an optional search input/header) used only to decide whether there's
	// enough space below the trigger to open downward.
	const ESTIMATED_DROPDOWN_HEIGHT = 260;

	const updateCoords = () => {
		if ( ! containerRef.current ) {
			return;
		}
		const rect = containerRef.current.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const openUpward =
			spaceBelow < ESTIMATED_DROPDOWN_HEIGHT && spaceAbove > spaceBelow;

		setCoords( {
			top: rect.bottom,
			bottom: window.innerHeight - rect.top,
			left: rect.left,
			width: rect.width,
			openUpward,
		} );
	};

	useEffect( () => {
		if ( isOpen ) {
			updateCoords();
			window.addEventListener( 'scroll', updateCoords, true );
			window.addEventListener( 'resize', updateCoords );
		}
		return () => {
			window.removeEventListener( 'scroll', updateCoords, true );
			window.removeEventListener( 'resize', updateCoords );
		};
	}, [ isOpen ] );

	useEffect( () => {
		if ( isOpen ) {
			if ( enableSearch && searchInputRef.current ) {
				requestAnimationFrame( () => searchInputRef.current?.focus() );
			}
			const selectedIndex = value
				? filteredOptions.findIndex( ( opt ) => opt.value === value )
				: 0;
			setHighlightedIndex( selectedIndex >= 0 ? selectedIndex : 0 );
			interactionType.current = 'keyboard';
		} else {
			setSearchQuery( '' );
			setTooltipState( null );
		}
	}, [ isOpen, value, enableSearch, filteredOptions.length ] );

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

	const handleSelect = ( option: SelectOption ) => {
		if (
			option.disabled ||
			option.variant === 'buy_pro' ||
			option.variant === 'coming_soon'
		) {
			return;
		}
		onChange( option.value );
		setIsOpen( false );
		setSearchQuery( '' );
		setTooltipState( null );
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
				if ( isOpen ) {
					if ( filteredOptions[ highlightedIndex ] ) {
						handleSelect( filteredOptions[ highlightedIndex ] );
					}
				} else {
					setIsOpen( ! isOpen );
				}
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
			case 'Escape':
				e.preventDefault();
				setIsOpen( false );
				break;
		}
	};

	const handleOptionHover = (
		e: React.MouseEvent< HTMLLIElement >,
		index: number,
		option: SelectOption
	) => {
		interactionType.current = 'mouse';
		setHighlightedIndex( index );
		if ( hoverTimeoutRef.current ) {
			clearTimeout( hoverTimeoutRef.current );
		}

		if (
			option.variant === 'buy_pro' ||
			option.variant === 'coming_soon'
		) {
			const rect = e.currentTarget.getBoundingClientRect();
			setTooltipState( {
				visible: true,
				top: rect.top,
				left: rect.left + rect.width / 2,
				width: rect.width,
				text:
					option.variant === 'buy_pro'
						? 'Available in Pro Version'
						: 'Coming Soon',
			} );
		} else {
			setTooltipState( null );
		}
	};

	const selectId = useMemo(
		() => id || `classic-select-${ Math.random().toString( 36 ).slice( 2, 9 ) }`,
		[ id ]
	);
	const sizeClass = size === 'short' ? 'min-content' : '';
	const explicitWidth =
		size === 'short' ? 'min-content' : size === 'regular' ? 'auto' : '100%';

	return (
		<div
			className={ `${ sizeClass } ${ className } ${
				classNames?.container || ''
			} opopw-align-middle`.trim() }
			ref={ containerRef }
		>
			{ label && (
				<label
					htmlFor={ selectId }
					className={ `opopw-block opopw-mb-1 ${
						classNames?.label || ''
					}`.trim() }
				>
					{ label }
				</label>
			) }

			<div
				className={ `opopw-relative ${ classNames?.innerContainer }` }
				style={ { width: explicitWidth } }
			>
				{ /* Trigger that looks like WP native select */ }
				<div
					id={ selectId }
					tabIndex={ disabled ? -1 : 0 }
					role="combobox"
					aria-expanded={ isOpen }
					onClick={ () => ! disabled && setIsOpen( ! isOpen ) }
					onKeyDown={ handleTriggerKeyDown }
					className={ `
            opopw-flex opopw-items-center opopw-justify-between 
            opopw-appearance-none opopw-border opopw-border-[#8c8f94] 
            opopw-rounded-[3px] opopw-px-2 opopw-pr-6 opopw-min-h-[30px] 
            opopw-leading-loose opopw-transition-all opopw-duration-100 
            opopw-select-none opopw-relative opopw-box-border opopw-w-full 
            ${
				disabled
					? `opopw-cursor-not-allowed opopw-bg-[#f0f0f1] opopw-text-[#a7aaad] ${
							classNames?.triggerDisabled || ''
					  }`
					: `opopw-cursor-pointer opopw-bg-white opopw-text-[#2c3338]`
			} 
            ${
				isOpen
					? `!opopw-border-[#2271b1] opopw-shadow-[0_0_0_1px_#2271b1] opopw-outline-none ${
							classNames?.triggerOpen || ''
					  }`
					: 'opopw-shadow-none'
			} 
            ${
				isError && ! isOpen
					? '!opopw-border-red-400 !opopw-shadow-none'
					: ''
			}
            ${ classNames?.trigger || '' }
          `.trim() }
				>
					<span
						className={ `opopw-flex-1 ${
							! renderOption
								? 'opopw-overflow-hidden opopw-text-ellipsis opopw-whitespace-nowrap'
								: ''
						} ${ classNames?.value || '' }`.trim() }
					>
						{ selectedOption
							? renderOption
								? renderOption( selectedOption )
								: selectedOption.label
							: placeholder }
					</span>

					<div className="opopw-absolute opopw-right-1.5 opopw-flex opopw-items-center opopw-gap-1">
						{ allowClear && value !== null && ! disabled && (
							<button
								onClick={ ( e ) => {
									e.stopPropagation();
									onChange( '' );
								} }
								className="opopw-p-0.5 opopw-bg-transparent opopw-border-none opopw-text-[#8c8f94] hover:opopw-text-red-500 opopw-cursor-pointer opopw-flex opopw-items-center"
							>
								<X size={ 12 } />
							</button>
						) }
						<ChevronDown size={ 14 } color="#50575e" />
					</div>
				</div>

				{ /* Dropdown Menu */ }
				{ isOpen &&
					createPortal(
						<div
							ref={ dropdownRef }
							className={ `opopw-fixed opopw-z-[999999] opopw-bg-white opopw-border-2 opopw-border-[#2271b1] ${
								differentDropdownWidth
									? 'opopw-rounded-[3px]'
									: coords.openUpward
										? 'opopw-border-b-0 opopw-mb-[-3px] opopw-rounded-t-[3px]'
										: 'opopw-border-t-0 opopw-mt-[-3px] opopw-rounded-b-[3px]'
							}
              opopw-rounded-b-[3px] opopw-shadow-[0_3px_5px_rgba(0,0,0,0.2)] opopw-p-0 opopw-box-border ${
					classNames?.dropdown || ''
				}`.trim() }
							style={ {
								...( coords.openUpward
									? { bottom: coords.bottom }
									: { top: coords.top } ),
								left: coords.left - 1, // Offset for border alignment
								width: coords.width + 2, // Compensate for border
								...( differentDropdownWidth
									? { width: 'max-content' }
									: {} ),
							} }
						>
							{ dropdownHeader && (
								<div className="opopw-border-b opopw-border-[#ccd0d4]">
									{ dropdownHeader }
								</div>
							) }

							{ enableSearch && (
								<div
									className={ `opopw-p-1.5 ${
										classNames?.searchContainer || ''
									}`.trim() }
								>
									<input
										ref={ searchInputRef }
										type="text"
										value={ searchQuery }
										onChange={ ( e ) => {
											setSearchQuery( e.target.value );
											setHighlightedIndex( 0 );
										} }
										onKeyDown={ handleSearchKeyDown }
										onClick={ ( e ) => e.stopPropagation() }
										placeholder="Search..."
										className={ `opopw-w-full opopw-px-2 opopw-leading-loose opopw-min-h-[26px] opopw-border opopw-border-[#aaaaaa] opopw-bg-[#fcfcfc] opopw-rounded-[3px] opopw-box-border opopw-text-[13px] focus:opopw-outline-none focus:opopw-shadow-none ${
											classNames?.searchInput || ''
										}`.trim() }
									/>
								</div>
							) }

							<ul
								ref={ listRef }
								role="listbox"
								className={ `opopw-max-h-[220px] opopw-overflow-y-auto opopw-m-0 opopw-p-0 opopw-list-none ${
									classNames?.list || ''
								}`.trim() }
								style={ {
									scrollbarWidth: 'thin',
								} }
							>
								{ isLoading ? (
									<li className="opopw-px-3 opopw-py-3 opopw-text-[#646970] opopw-text-[13px] opopw-flex opopw-items-center opopw-gap-2 opopw-justify-center">
										<Hourglass
											size={ 14 }
											className="opopw-animate-spin"
										/>
										Loading...
									</li>
								) : filteredOptions.length === 0 ? (
									<li className="opopw-px-3 opopw-py-1.5 opopw-text-[#646970] opopw-italic opopw-text-[13px] opopw-m-0">
										{ searchQuery
											? 'No results found'
											: 'No options available' }
									</li>
								) : (
									filteredOptions.map( ( opt, index ) => {
										const isSelected =
											selectedOption?.value === opt.value;
										const isHighlighted =
											highlightedIndex === index;
										const isPro = opt.variant === 'buy_pro';
										const isComingSoon =
											opt.variant === 'coming_soon';
										const isDisabled =
											opt.disabled ||
											isPro ||
											isComingSoon;

										return (
											<li
												key={ opt.value }
												role="option"
												aria-selected={ isSelected }
												onMouseEnter={ ( e ) =>
													handleOptionHover(
														e,
														index,
														opt
													)
												}
												onMouseLeave={ () => {
													hoverTimeoutRef.current =
														window.setTimeout(
															() =>
																setTooltipState(
																	null
																),
															150
														);
												} }
												onClick={ ( e ) => {
													e.stopPropagation();
													handleSelect( opt );
												} }
												className={ `
                        opopw-px-3 opopw-py-1.5 opopw-flex opopw-items-center 
                        opopw-justify-between opopw-text-[13px] opopw-m-0 
                        ${
							isDisabled
								? 'opopw-cursor-not-allowed'
								: 'opopw-cursor-pointer'
						} 
                        ${
							isHighlighted
								? `opopw-bg-[#2271b1] opopw-text-white ${
										classNames?.optionHighlighted || ''
								  }`
								: isDisabled
								? 'opopw-bg-transparent opopw-text-[#a7aaad]'
								: `opopw-bg-transparent opopw-text-[#2c3338]`
						} 
                        ${ isSelected ? classNames?.optionSelected || '' : '' }
                        ${ classNames?.option || '' }
                      `.trim() }
											>
												<div className="opopw-flex-1 opopw-overflow-hidden">
													{ renderOption
														? renderOption( opt )
														: opt.label }
												</div>

												{ /* Icons for variants */ }
												{ isPro && (
													<span
														className={ `opopw-ml-2 opopw-flex ${
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
														className={ `opopw-ml-2 opopw-text-[10px] opopw-uppercase opopw-px-1.5 opopw-py-0.5 opopw-rounded-[10px] opopw-font-semibold opopw-flex opopw-items-center opopw-gap-1 ${
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

							{ dropdownFooter && (
								<div className="opopw-border-t opopw-border-[#ccd0d4]">
									{ dropdownFooter }
								</div>
							) }
						</div>
,
						document.body
					) }
			</div>

			{ description && (
				<p
					className={ `description opopw-mt-1 ${
						classNames?.description || ''
					}`.trim() }
				>
					{ description }
				</p>
			) }

			{ /* Portal Tooltip or absolute Tooltip for variants */ }
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
					{ /* Tooltip caret */ }
					<div className="opopw-absolute -opopw-bottom-1 opopw-left-1/2 -opopw-translate-x-1/2 opopw-border-x-4 opopw-border-t-4 opopw-border-x-transparent opopw-border-b-transparent opopw-border-t-[#1d2327]" />
				</div>
			) }
		</div>
	);
};
