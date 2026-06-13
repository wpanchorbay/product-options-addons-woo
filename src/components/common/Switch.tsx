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
			switch: 'spoa-h-4 spoa-w-7',
			thumb: 'spoa-h-3 spoa-w-3',
			translate: 'spoa-translate-x-3',
		},
		medium: {
			switch: 'spoa-h-6 spoa-w-11',
			thumb: 'spoa-h-5 spoa-w-5',
			translate: 'spoa-translate-x-5',
		},
		large: {
			switch: 'spoa-h-7 spoa-w-14',
			thumb: 'spoa-h-6 spoa-w-6',
			translate: 'spoa-translate-x-7',
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
        spoa-group spoa-relative spoa-inline-flex spoa-shrink-0 spoa-cursor-pointer spoa-items-center spoa-rounded-full spoa-border-2 spoa-border-transparent spoa-transition-colors spoa-duration-200 spoa-ease-in-out focus:spoa-outline-none focus:spoa-ring-2 focus:spoa-ring-primary focus:spoa-ring-offset-2
        ${ currentSize.switch }
        ${ checked ? 'spoa-bg-green-500' : 'spoa-bg-black' }
        ${ disabled ? 'spoa-opacity-50 spoa-cursor-not-allowed' : '' }
        ${ className }
        ${ classNames?.root || '' }
      ` }
		>
			<span className="spoa-sr-only">Toggle setting</span>
			<span
				aria-hidden="true"
				className={ `
          spoa-pointer-events-none spoa-inline-block spoa-transform spoa-rounded-full spoa-bg-white spoa-shadow spoa-ring-0 spoa-transition spoa-duration-200 spoa-ease-in-out
          ${ currentSize.thumb }
          ${ checked ? currentSize.translate : 'spoa-translate-x-0' }
          ${ classNames?.thumb || '' }
        ` }
			/>
		</button>
	);
};
