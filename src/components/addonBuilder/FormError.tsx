import React from 'react';

export const FormError = ( { message }: { message?: string } ) => {
	if ( ! message ) {
		return null;
	}
	return (
		<div className="opopw-text-[#d63638] opopw-text-xs opopw-mt-1">
			{ message }
		</div>
	);
};
