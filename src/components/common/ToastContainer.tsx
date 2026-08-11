import { FC } from 'react';
import { useToast } from '../../store/toast/use-toast';
import { Toast } from './Toast';

export const ToastContainer: FC = () => {
	const { toasts, removeToast } = useToast();
	return (
		<div className="opopw-fixed opopw-bottom-[30px] opopw-right-[10px] opopw-z-[999999] opopw-flex opopw-flex-col opopw-gap-[10px] opopw-min-w-[200px] opopw-pointer-events-none">
			{ toasts.map( ( toast ) => (
				<Toast
					key={ toast.id }
					toast={ toast }
					onDismiss={ removeToast }
				/>
			) ) }
		</div>
	);
};
