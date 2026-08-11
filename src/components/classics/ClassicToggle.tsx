import React from 'react';

interface ClassicToggleProps {
	checked: boolean;
	onChange: ( checked: boolean ) => void;
	disabled?: boolean;
	className?: string;
	isError?: boolean;
	id?: string;
}

export const ClassicToggle: React.FC< ClassicToggleProps > = ( {
	checked,
	onChange,
	disabled,
	className = '',
	isError = false,
	id,
} ) => {
	const toggleId =
		id || `classic-toggle-${ Math.random().toString( 36 ).slice( 2, 9 ) }`;

	return (
		<div
			className={ `opopw-relative opopw-inline-block opopw-w-10 opopw-align-middle opopw-select-none opopw-transition opopw-duration-200 opopw-ease-in ${ className }` }
		>
			<input
				type="checkbox"
				id={ toggleId }
				checked={ checked }
				onChange={ ( e ) => onChange( e.target.checked ) }
				disabled={ disabled }
				className="opopw-toggle-checkbox opopw-absolute opopw-block opopw-w-5 opopw-h-5 opopw-rounded-full opopw-bg-white opopw-border-4 opopw-appearance-none opopw-cursor-pointer checked:opopw-right-0 checked:opopw-border-[#2271b1] opopw-right-5 opopw-border-[#8c8f94] opopw-transition-all opopw-duration-200"
			/>
			<label
				htmlFor={ toggleId }
				className={ `opopw-toggle-label opopw-block opopw-overflow-hidden opopw-h-5 opopw-rounded-full opopw-cursor-pointer transition-colors duration-200 ${
					checked
						? isError ? '!opopw-bg-red-400' : 'opopw-bg-[#2271b1]'
						: isError ? '!opopw-bg-red-400' : 'opopw-bg-[#8c8f94]'
				} ${
					disabled
						? 'opopw-opacity-50 opopw-cursor-not-allowed'
						: ''
				}` }
			></label>
			<style>{ `
        .opopw-toggle-checkbox:checked {
          right: 0;
          border-color: ${isError ? '#f87171' : '#2271b1'};
        }
        .opopw-toggle-checkbox:focus {
            outline: none;
        }
        ${isError ? `.opopw-toggle-checkbox { border-color: #f87171 !important; }` : ''}
      ` }</style>
		</div>
	);
};
