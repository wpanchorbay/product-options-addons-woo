import React, { useMemo } from 'react';

interface ClassicInputProps
	extends Omit< React.InputHTMLAttributes< HTMLInputElement >, 'size' > {
	label?: string;
	description?: string;
	size?: 'regular' | 'short' | 'small' | 'large';
	inputType?: 'text' | 'price' | 'decimal';
	isError?: boolean;
	className?: string;
}

export const ClassicInput: React.FC< ClassicInputProps > = ( {
	label,
	description,
	size = 'regular',
	inputType = 'text',
	className = '',
	isError = false,
	id,
	...props
} ) => {
	const sizeClass = {
		regular: 'regular-text',
		short: 'short',
		small: 'small-text',
		large: 'large-text',
	}[ size ];

	const typeClass = {
		text: '',
		price: 'wc_input_price',
		decimal: 'wc_input_decimal',
	}[ inputType ];

	const errorClass = isError
		? '!spoa-border-red-400 !spoa-shadow-none'
		: '';

	const inputId = useMemo(
		() => id || `classic-input-${ Math.random().toString( 36 ).slice( 2, 9 ) }`,
		[ id ]
	);

	return (
		<>
			{ label && <label htmlFor={ inputId }>{ label }</label> }
			<input
				id={ inputId }
				className={ `${ sizeClass } ${ typeClass } ${ errorClass } ${ className }`.trim() }
				type={ props.type || 'text' }
				{ ...props }
			/>
			{ description && (
				<p className="description spoa-block spoa-mt-1">
					{ description }
				</p>
			) }
		</>
	);
};
