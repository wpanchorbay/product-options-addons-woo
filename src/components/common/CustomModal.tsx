import React, { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface CustomModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	maxWidth?: string;
	closeOnOutsideClick?: boolean;
	className?: string;
	showHeader?: boolean;
	classNames?: {
		header?: string;
		body?: string;
		footer?: string;
	};
}

const CustomModal: React.FC< CustomModalProps > = ( {
	isOpen,
	onClose,
	title,
	children,
	footer,
	maxWidth = 'spoa-max-w-2xl',
	closeOnOutsideClick = true,
	className = '',
	showHeader = true,
	classNames = {
		header: '',
		body: '',
		footer: '',
	},
} ) => {
	// Handle Escape key to close
	useEffect( () => {
		const handleEsc = ( e: KeyboardEvent ) => {
			if ( e.key === 'Escape' ) {
				onClose();
			}
		};

		if ( isOpen ) {
			window.addEventListener( 'keydown', handleEsc );
			// Prevent scrolling on body when modal is open
			document.body.style.overflow = 'hidden';
		}

		return () => {
			window.removeEventListener( 'keydown', handleEsc );
			document.body.style.overflow = '';
		};
	}, [ isOpen, onClose ] );

	if ( ! isOpen ) {
		return null;
	}

	return createPortal(
		<div className="spoa-fixed spoa-inset-0 spoa-z-[9998] spoa-flex spoa-items-center spoa-justify-center spoa-p-4 spoa-bg-black/75 spoa-transition-opacity spoa-duration-300">
			{ /* Backdrop click handler */ }
			<div
				className="spoa-absolute spoa-inset-0"
				onClick={ closeOnOutsideClick ? onClose : undefined }
			/>

			{ /* Modal Content */ }
			<div
				className={ `
          spoa-relative spoa-w-full ${ maxWidth } 
          spoa-bg-white spoa-shadow-2xl spoa-rounded-xl 
          spoa-flex spoa-flex-col spoa-max-h-[90vh]
          spoa-animate-in spoa-fade-in spoa-zoom-in-95 spoa-duration-200
          ${ className }
        ` }
				role="dialog"
				aria-modal="true"
			>
				{ /* Header */ }
				{ showHeader && (
					<div
						className={ `spoa-flex spoa-items-center spoa-justify-between spoa-px-6 spoa-py-4 spoa-border-b spoa-border-gray-100 ${ classNames.header }` }
					>
						<h3 className="spoa-text-lg spoa-font-semibold spoa-text-gray-900">
							{ title }
						</h3>
						<button
							onClick={ onClose }
							className="spoa-p-1.5 spoa-text-gray-400 hover:spoa-text-gray-600 spoa-transition-colors hover:spoa-bg-gray-100 spoa-rounded-full"
							aria-label="Close modal"
						>
							<X className="spoa-w-5 spoa-h-5" />
						</button>
					</div>
				) }

				{ /* Body */ }
				<div
					className={ `spoa-p-6 spoa-overflow-y-auto spoa-flex-1 ${ classNames.body }` }
				>
					{ children }
				</div>

				{ /* Footer */ }
				{ footer && (
					<div
						className={ `spoa-flex spoa-items-center spoa-justify-end spoa-gap-3 spoa-px-6 spoa-py-4 spoa-bg-gray-50 spoa-border-t spoa-border-gray-100 spoa-rounded-b-xl ${ classNames.footer }` }
					>
						{ footer }
					</div>
				) }
			</div>
		</div>,
		document.body
	);
};

export default CustomModal;
