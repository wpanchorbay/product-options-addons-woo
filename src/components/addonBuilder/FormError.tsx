import React from 'react';

export const FormError = ( { message }: { message?: string } ) => {
	if ( ! message ) {
		return null;
	}
	return (
		<div className="spoa-text-[#d63638] spoa-text-xs spoa-mt-1">
			{ message }
		</div>
	);
};
