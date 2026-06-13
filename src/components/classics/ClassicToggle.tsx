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
			className={ `spoa-relative spoa-inline-block spoa-w-10 spoa-align-middle spoa-select-none spoa-transition spoa-duration-200 spoa-ease-in ${ className }` }
		>
			<input
				type="checkbox"
				id={ toggleId }
				checked={ checked }
				onChange={ ( e ) => onChange( e.target.checked ) }
				disabled={ disabled }
				className="spoa-toggle-checkbox spoa-absolute spoa-block spoa-w-5 spoa-h-5 spoa-rounded-full spoa-bg-white spoa-border-4 spoa-appearance-none spoa-cursor-pointer checked:spoa-right-0 checked:spoa-border-[#2271b1] spoa-right-5 spoa-border-[#8c8f94] spoa-transition-all spoa-duration-200"
			/>
			<label
				htmlFor={ toggleId }
				className={ `spoa-toggle-label spoa-block spoa-overflow-hidden spoa-h-5 spoa-rounded-full spoa-cursor-pointer transition-colors duration-200 ${
					checked
						? isError ? '!spoa-bg-red-400' : 'spoa-bg-[#2271b1]'
						: isError ? '!spoa-bg-red-400' : 'spoa-bg-[#8c8f94]'
				} ${
					disabled
						? 'spoa-opacity-50 spoa-cursor-not-allowed'
						: ''
				}` }
			></label>
			<style>{ `
        .spoa-toggle-checkbox:checked {
          right: 0;
          border-color: ${isError ? '#f87171' : '#2271b1'};
        }
        .spoa-toggle-checkbox:focus {
            outline: none;
        }
        ${isError ? `.spoa-toggle-checkbox { border-color: #f87171 !important; }` : ''}
      ` }</style>
		</div>
	);
};
