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
	maxWidth = 'opopw-max-w-2xl',
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
		<div className="opopw-fixed opopw-inset-0 opopw-z-[9998] opopw-flex opopw-items-center opopw-justify-center opopw-p-4 opopw-bg-black/75 opopw-transition-opacity opopw-duration-300">
			{ /* Backdrop click handler */ }
			<div
				className="opopw-absolute opopw-inset-0"
				onClick={ closeOnOutsideClick ? onClose : undefined }
			/>

			{ /* Modal Content */ }
			<div
				className={ `
          opopw-relative opopw-w-full ${ maxWidth } 
          opopw-bg-white opopw-shadow-2xl opopw-rounded-xl 
          opopw-flex opopw-flex-col opopw-max-h-[90vh]
          opopw-animate-in opopw-fade-in opopw-zoom-in-95 opopw-duration-200
          ${ className }
        ` }
				role="dialog"
				aria-modal="true"
			>
				{ /* Header */ }
				{ showHeader && (
					<div
						className={ `opopw-flex opopw-items-center opopw-justify-between opopw-px-6 opopw-py-4 opopw-border-b opopw-border-gray-100 ${ classNames.header }` }
					>
						<h3 className="opopw-text-lg opopw-font-semibold opopw-text-gray-900">
							{ title }
						</h3>
						<button
							onClick={ onClose }
							className="opopw-p-1.5 opopw-text-gray-400 hover:opopw-text-gray-600 opopw-transition-colors hover:opopw-bg-gray-100 opopw-rounded-full"
							aria-label="Close modal"
						>
							<X className="opopw-w-5 opopw-h-5" />
						</button>
					</div>
				) }

				{ /* Body */ }
				<div
					className={ `opopw-p-6 opopw-overflow-y-auto opopw-flex-1 ${ classNames.body }` }
				>
					{ children }
				</div>

				{ /* Footer */ }
				{ footer && (
					<div
						className={ `opopw-flex opopw-items-center opopw-justify-end opopw-gap-3 opopw-px-6 opopw-py-4 opopw-bg-gray-50 opopw-border-t opopw-border-gray-100 opopw-rounded-b-xl ${ classNames.footer }` }
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
