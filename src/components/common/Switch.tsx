import React from 'react';

interface SwitchProps {
	checked: boolean;
	onChange: ( checked: boolean ) => void;
	disabled?: boolean;
	size?: 'small' | 'medium' | 'large';
	className?: string;
	classNames?: {
		root?: string;
		thumb?: string;
	};
}

export const Switch: React.FC< SwitchProps > = ( {
	checked,
	onChange,
	disabled,
	size = 'medium',
	className = '',
	classNames,
} ) => {
	const sizeConfig = {
		small: {
			switch: 'opopw-h-4 opopw-w-7',
			thumb: 'opopw-h-3 opopw-w-3',
			translate: 'opopw-translate-x-3',
		},
		medium: {
			switch: 'opopw-h-6 opopw-w-11',
			thumb: 'opopw-h-5 opopw-w-5',
			translate: 'opopw-translate-x-5',
		},
		large: {
			switch: 'opopw-h-7 opopw-w-14',
			thumb: 'opopw-h-6 opopw-w-6',
			translate: 'opopw-translate-x-7',
		},
	};

	const currentSize = sizeConfig[ size ];

	return (
		<button
			type="button"
			role="switch"
			aria-checked={ checked }
			onClick={ () => ! disabled && onChange( ! checked ) }
			disabled={ disabled }
			className={ `
        opopw-group opopw-relative opopw-inline-flex opopw-shrink-0 opopw-cursor-pointer opopw-items-center opopw-rounded-full opopw-border-2 opopw-border-transparent opopw-transition-colors opopw-duration-200 opopw-ease-in-out focus:opopw-outline-none focus:opopw-ring-2 focus:opopw-ring-primary focus:opopw-ring-offset-2
        ${ currentSize.switch }
        ${ checked ? 'opopw-bg-green-500' : 'opopw-bg-black' }
        ${ disabled ? 'opopw-opacity-50 opopw-cursor-not-allowed' : '' }
        ${ className }
        ${ classNames?.root || '' }
      ` }
		>
			<span className="opopw-sr-only">Toggle setting</span>
			<span
				aria-hidden="true"
				className={ `
          opopw-pointer-events-none opopw-inline-block opopw-transform opopw-rounded-full opopw-bg-white opopw-shadow opopw-ring-0 opopw-transition opopw-duration-200 opopw-ease-in-out
          ${ currentSize.thumb }
          ${ checked ? currentSize.translate : 'opopw-translate-x-0' }
          ${ classNames?.thumb || '' }
        ` }
			/>
		</button>
	);
};
