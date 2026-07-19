import React from 'react';

interface CheckboxProps {
	label?: string | React.ReactNode;
	checked: boolean;
	onChange: ( checked: boolean ) => void;
	disabled?: boolean;
	classNames?: {
		root?: string;
		box?: string;
		icon?: string;
		label?: string;
	};
}

export const Checkbox: React.FC< CheckboxProps > = ( {
	label,
	checked,
	onChange,
	disabled,
	classNames,
} ) => {
	return (
		<label
			className={ `opopw-flex opopw-items-center opopw-gap-3 opopw-cursor-pointer ${
				disabled
					? 'opopw-opacity-50 opopw-cursor-not-allowed'
					: ''
			} ${ classNames?.root || '' }` }
		>
			<div
				className={ `
        opopw-flex opopw-items-center opopw-justify-center
        opopw-w-4 opopw-h-4 opopw-rounded opopw-border-2 opopw-transition-all opopw-duration-200
        ${
			checked
				? 'opopw-border-primary opopw-bg-primary'
				: 'opopw-border-[#949494] opopw-bg-transparent hover:opopw-border-primary'
		}
        ${ classNames?.box || '' }
      ` }
			>
				<svg
					className={ `opopw-w-3.5 opopw-h-3.5 opopw-text-white opopw-transform opopw-transition-transform opopw-duration-200 ${
						checked ? 'opopw-scale-100' : 'opopw-scale-0'
					} ${ classNames?.icon || '' }` }
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				<input
					type="checkbox"
					className="!opopw-hidden"
					checked={ checked }
					onChange={ ( e ) => onChange( e.target.checked ) }
					disabled={ disabled }
				/>
			</div>
			{ label && (
				<span
					className={ `opopw-text-[13px] opopw-font-[400] opopw-leading-[20px] opopw-text-[#1e1e1e] ${
						classNames?.label || ''
					}` }
				>
					{ label }
				</span>
			) }
		</label>
	);
};
