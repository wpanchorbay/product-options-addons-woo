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
			className={ `spoa-flex spoa-items-center spoa-gap-3 spoa-cursor-pointer ${
				disabled
					? 'spoa-opacity-50 spoa-cursor-not-allowed'
					: ''
			} ${ classNames?.root || '' }` }
		>
			<div
				className={ `
        spoa-flex spoa-items-center spoa-justify-center
        spoa-w-4 spoa-h-4 spoa-rounded spoa-border-2 spoa-transition-all spoa-duration-200
        ${
			checked
				? 'spoa-border-primary spoa-bg-primary'
				: 'spoa-border-[#949494] spoa-bg-transparent hover:spoa-border-primary'
		}
        ${ classNames?.box || '' }
      ` }
			>
				<svg
					className={ `spoa-w-3.5 spoa-h-3.5 spoa-text-white spoa-transform spoa-transition-transform spoa-duration-200 ${
						checked ? 'spoa-scale-100' : 'spoa-scale-0'
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
					className="!spoa-hidden"
					checked={ checked }
					onChange={ ( e ) => onChange( e.target.checked ) }
					disabled={ disabled }
				/>
			</div>
			{ label && (
				<span
					className={ `spoa-text-[13px] spoa-font-[400] spoa-leading-[20px] spoa-text-[#1e1e1e] ${
						classNames?.label || ''
					}` }
				>
					{ label }
				</span>
			) }
		</label>
	);
};
