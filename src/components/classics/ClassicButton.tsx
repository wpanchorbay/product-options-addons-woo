import React from 'react';

interface ClassicButtonProps
	extends React.ButtonHTMLAttributes< HTMLButtonElement > {
	children: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'link' | 'link-delete' | 'action';
	loading?: boolean;
	className?: string;
}

export const ClassicButton: React.FC< ClassicButtonProps > = ( {
	children,
	variant = 'primary',
	loading = false,
	className = '',
	...props
} ) => {
	const variantClass = {
		primary: 'button button-primary',
		secondary: 'button button-secondary',
		link: 'button-link',
		'link-delete': 'button-link button-link-delete',
		action: 'button button-primary woocommerce-save-button',
	}[ variant ];

	return (
		<button
			className={ `${ variantClass } ${ className } ${
				loading
					? 'spoa-opacity-70 spoa-cursor-not-allowed'
					: ''
			}` }
			disabled={ loading || props.disabled }
			{ ...props }
		>
			<span className="spoa-flex spoa-items-center spoa-gap-2">
				{ loading && (
					<svg
						className="spoa-animate-spin spoa-h-3 spoa-w-3 spoa-text-current"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="spoa-opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="spoa-opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				) }
				{ children }
			</span>
		</button>
	);
};
