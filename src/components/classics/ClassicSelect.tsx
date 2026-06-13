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

	// Portal coordinates
	const [ coords, setCoords ] = useState( { top: 0, left: 0, width: 0 } );

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

	const updateCoords = () => {
		if ( ! containerRef.current ) {
			return;
		}
		const rect = containerRef.current.getBoundingClientRect();
		setCoords( {
			top: rect.bottom,
			left: rect.left,
			width: rect.width,
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
			} spoa-align-middle`.trim() }
			ref={ containerRef }
		>
			{ label && (
				<label
					htmlFor={ selectId }
					className={ `spoa-block spoa-mb-1 ${
						classNames?.label || ''
					}`.trim() }
				>
					{ label }
				</label>
			) }

			<div
				className={ `spoa-relative ${ classNames?.innerContainer }` }
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
            spoa-flex spoa-items-center spoa-justify-between 
            spoa-appearance-none spoa-border spoa-border-[#8c8f94] 
            spoa-rounded-[3px] spoa-px-2 spoa-pr-6 spoa-min-h-[30px] 
            spoa-leading-loose spoa-transition-all spoa-duration-100 
            spoa-select-none spoa-relative spoa-box-border spoa-w-full 
            ${
				disabled
					? `spoa-cursor-not-allowed spoa-bg-[#f0f0f1] spoa-text-[#a7aaad] ${
							classNames?.triggerDisabled || ''
					  }`
					: `spoa-cursor-pointer spoa-bg-white spoa-text-[#2c3338]`
			} 
            ${
				isOpen
					? `!spoa-border-[#2271b1] spoa-shadow-[0_0_0_1px_#2271b1] spoa-outline-none ${
							classNames?.triggerOpen || ''
					  }`
					: 'spoa-shadow-none'
			} 
            ${
				isError && ! isOpen
					? '!spoa-border-red-400 !spoa-shadow-none'
					: ''
			}
            ${ classNames?.trigger || '' }
          `.trim() }
				>
					<span
						className={ `spoa-flex-1 ${
							! renderOption
								? 'spoa-overflow-hidden spoa-text-ellipsis spoa-whitespace-nowrap'
								: ''
						} ${ classNames?.value || '' }`.trim() }
					>
						{ selectedOption
							? renderOption
								? renderOption( selectedOption )
								: selectedOption.label
							: placeholder }
					</span>

					<div className="spoa-absolute spoa-right-1.5 spoa-flex spoa-items-center spoa-gap-1">
						{ allowClear && value !== null && ! disabled && (
							<button
								onClick={ ( e ) => {
									e.stopPropagation();
									onChange( '' );
								} }
								className="spoa-p-0.5 spoa-bg-transparent spoa-border-none spoa-text-[#8c8f94] hover:spoa-text-red-500 spoa-cursor-pointer spoa-flex spoa-items-center"
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
							className={ `spoa-fixed spoa-z-[999999] spoa-bg-white spoa-border-2 spoa-border-[#2271b1] ${
								differentDropdownWidth
									? 'spoa-rounded-[3px]'
									: 'spoa-border-t-0 spoa-mt-[-3px] spoa-rounded-b-[3px]'
							} 
              spoa-rounded-b-[3px] spoa-shadow-[0_3px_5px_rgba(0,0,0,0.2)] spoa-p-0 spoa-box-border ${
					classNames?.dropdown || ''
				}`.trim() }
							style={ {
								top: coords.top,
								left: coords.left - 1, // Offset for border alignment
								width: coords.width + 2, // Compensate for border
								...( differentDropdownWidth
									? { width: 'max-content' }
									: {} ),
							} }
						>
							{ dropdownHeader && (
								<div className="spoa-border-b spoa-border-[#ccd0d4]">
									{ dropdownHeader }
								</div>
							) }

							{ enableSearch && (
								<div
									className={ `spoa-p-1.5 ${
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
										className={ `spoa-w-full spoa-px-2 spoa-leading-loose spoa-min-h-[26px] spoa-border spoa-border-[#aaaaaa] spoa-bg-[#fcfcfc] spoa-rounded-[3px] spoa-box-border spoa-text-[13px] focus:spoa-outline-none focus:spoa-shadow-none ${
											classNames?.searchInput || ''
										}`.trim() }
									/>
								</div>
							) }

							<ul
								ref={ listRef }
								role="listbox"
								className={ `spoa-max-h-[220px] spoa-overflow-y-auto spoa-m-0 spoa-p-0 spoa-list-none ${
									classNames?.list || ''
								}`.trim() }
								style={ {
									scrollbarWidth: 'thin',
								} }
							>
								{ isLoading ? (
									<li className="spoa-px-3 spoa-py-3 spoa-text-[#646970] spoa-text-[13px] spoa-flex spoa-items-center spoa-gap-2 spoa-justify-center">
										<Hourglass
											size={ 14 }
											className="spoa-animate-spin"
										/>
										Loading...
									</li>
								) : filteredOptions.length === 0 ? (
									<li className="spoa-px-3 spoa-py-1.5 spoa-text-[#646970] spoa-italic spoa-text-[13px] spoa-m-0">
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
                        spoa-px-3 spoa-py-1.5 spoa-flex spoa-items-center 
                        spoa-justify-between spoa-text-[13px] spoa-m-0 
                        ${
							isDisabled
								? 'spoa-cursor-not-allowed'
								: 'spoa-cursor-pointer'
						} 
                        ${
							isHighlighted
								? `spoa-bg-[#2271b1] spoa-text-white ${
										classNames?.optionHighlighted || ''
								  }`
								: isDisabled
								? 'spoa-bg-transparent spoa-text-[#a7aaad]'
								: `spoa-bg-transparent spoa-text-[#2c3338]`
						} 
                        ${ isSelected ? classNames?.optionSelected || '' : '' }
                        ${ classNames?.option || '' }
                      `.trim() }
											>
												<div className="spoa-flex-1 spoa-overflow-hidden">
													{ renderOption
														? renderOption( opt )
														: opt.label }
												</div>

												{ /* Icons for variants */ }
												{ isPro && (
													<span
														className={ `spoa-ml-2 spoa-flex ${
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
														className={ `spoa-ml-2 spoa-text-[10px] spoa-uppercase spoa-px-1.5 spoa-py-0.5 spoa-rounded-[10px] spoa-font-semibold spoa-flex spoa-items-center spoa-gap-1 ${
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

							{ dropdownFooter && (
								<div className="spoa-border-t spoa-border-[#ccd0d4]">
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
					className={ `description spoa-mt-1 ${
						classNames?.description || ''
					}`.trim() }
				>
					{ description }
				</p>
			) }

			{ /* Portal Tooltip or absolute Tooltip for variants */ }
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
					{ /* Tooltip caret */ }
					<div className="spoa-absolute -spoa-bottom-1 spoa-left-1/2 -spoa-translate-x-1/2 spoa-border-x-4 spoa-border-t-4 spoa-border-x-transparent spoa-border-b-transparent spoa-border-t-[#1d2327]" />
				</div>
			) }
		</div>
	);
};
