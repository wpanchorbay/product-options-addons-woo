import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes< HTMLButtonElement > {
	children: React.ReactNode;
	className?: string;
	size?: 'small' | 'medium' | 'large';
	color?: 'primary' | 'secondary' | 'danger';
	variant?: 'solid' | 'outline' | 'ghost';
}

const Button = forwardRef< HTMLButtonElement, ButtonProps >(
	(
		{
			children,
			className = '',
			size = 'medium',
			color = 'primary',
			variant = 'solid',
			...props
		},
		ref
	) => {
		const sizeClasses = {
			small: 'opopw-px-[8px] opopw-py-[5px]',
			medium: 'opopw-px-[12px] opopw-py-[6px]',
			large: 'opopw-px-[16px] opopw-py-[10px]',
		};

		const colorClasses = {
			primary: {
				solid: 'opopw-bg-primary opopw-text-white opopw-border opopw-border-primary hover:opopw-bg-primary-hovered hover:opopw-border-primary-hovered',
				outline:
					'opopw-bg-transparent opopw-border opopw-border-primary opopw-text-primary hover:opopw-bg-primary hover:opopw-text-white',
				ghost: 'opopw-bg-transparent opopw-text-primary hover:opopw-text-primary-hovered hover:opopw-bg-primary/10',
			},
			secondary: {
				solid: 'opopw-bg-secondary opopw-text-white opopw-border opopw-border-secondary hover:opopw-bg-secondary-hovered',
				outline:
					'opopw-bg-transparent opopw-border opopw-border-secondary opopw-text-secondary hover:opopw-bg-secondary hover:opopw-text-white',
				ghost: 'opopw-bg-transparent opopw-text-[#1e1e1e] hover:!opopw-text-primary',
			},
			danger: {
				solid: 'opopw-bg-red-500 opopw-text-white opopw-border opopw-border-red-500 hover:opopw-bg-red-600 hover:opopw-border-red-600',
				outline:
					'opopw-bg-transparent opopw-border opopw-border-red-500 opopw-text-red-500 hover:opopw-bg-red-500 hover:opopw-text-white',
				ghost: 'opopw-bg-transparent opopw-text-red-500 hover:opopw-bg-red-500/10',
			},
		};

		// Safely access nested properties
		const variantClasses =
			colorClasses[ color ]?.[ variant ] ?? colorClasses.primary.solid;
		const finalSizeClass = sizeClasses[ size ] ?? sizeClasses.medium;

		return (
			<button
				ref={ ref }
				className={ `
                opopw-flex opopw-items-center opopw-justify-center opopw-gap-[6px]
                opopw-text-default opopw-rounded-[8px] opopw-transition-all opopw-duration-200
                disabled:opopw-opacity-50 disabled:opopw-cursor-not-allowed
                ${ finalSizeClass } 
                ${ variantClasses } 
                ${ className }
            ` }
				{ ...props }
			>
				{ children }
			</button>
		);
	}
);

export default Button;
