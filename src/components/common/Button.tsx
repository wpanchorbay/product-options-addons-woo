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
			small: 'spoa-px-[8px] spoa-py-[5px]',
			medium: 'spoa-px-[12px] spoa-py-[6px]',
			large: 'spoa-px-[16px] spoa-py-[10px]',
		};

		const colorClasses = {
			primary: {
				solid: 'spoa-bg-primary spoa-text-white spoa-border spoa-border-primary hover:spoa-bg-primary-hovered hover:spoa-border-primary-hovered',
				outline:
					'spoa-bg-transparent spoa-border spoa-border-primary spoa-text-primary hover:spoa-bg-primary hover:spoa-text-white',
				ghost: 'spoa-bg-transparent spoa-text-primary hover:spoa-text-primary-hovered hover:spoa-bg-primary/10',
			},
			secondary: {
				solid: 'spoa-bg-secondary spoa-text-white spoa-border spoa-border-secondary hover:spoa-bg-secondary-hovered',
				outline:
					'spoa-bg-transparent spoa-border spoa-border-secondary spoa-text-secondary hover:spoa-bg-secondary hover:spoa-text-white',
				ghost: 'spoa-bg-transparent spoa-text-[#1e1e1e] hover:!spoa-text-primary',
			},
			danger: {
				solid: 'spoa-bg-red-500 spoa-text-white spoa-border spoa-border-red-500 hover:spoa-bg-red-600 hover:spoa-border-red-600',
				outline:
					'spoa-bg-transparent spoa-border spoa-border-red-500 spoa-text-red-500 hover:spoa-bg-red-500 hover:spoa-text-white',
				ghost: 'spoa-bg-transparent spoa-text-red-500 hover:spoa-bg-red-500/10',
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
                spoa-flex spoa-items-center spoa-justify-center spoa-gap-[6px]
                spoa-text-default spoa-rounded-[8px] spoa-transition-all spoa-duration-200
                disabled:spoa-opacity-50 disabled:spoa-cursor-not-allowed
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
