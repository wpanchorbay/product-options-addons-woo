import { FC } from 'react';
import { useToast } from '../../store/toast/use-toast';
import { Toast } from './Toast';

export const ToastContainer: FC = () => {
	const { toasts, removeToast } = useToast();
	return (
		<div className="spoa-fixed spoa-bottom-[30px] spoa-right-[10px] spoa-z-[999999] spoa-flex spoa-flex-col spoa-gap-[10px] spoa-min-w-[200px] spoa-pointer-events-none">
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
