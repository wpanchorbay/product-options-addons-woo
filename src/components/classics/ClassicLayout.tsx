import { FC, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import { useWpabStore } from '../../store/wpabStore';

const ClassicLayout: FC = () => {
	const store = useWpabStore();
	const location = useLocation();

	// Determine page title based on route
	const getPageTitle = () => {
		const path = location.pathname;
		if (path === '/option-groups/new') {
			return __('New Option Group', 'smart-product-options-addons');
		}
		if (path.startsWith('/option-groups/')) {
			return __('Edit Option Group', 'smart-product-options-addons');
		}
		if (path === '/' || path === '/option-groups') {
			return __('Option Groups', 'smart-product-options-addons');
		}
		if (path === '/settings') {
			return __('Settings', 'smart-product-options-addons');
		}
		return store.pluginData?.plugin_name || __('Smart Product Options and Addons', 'smart-product-options-addons');
	};

	const context =
		(window as any).spoaPlugin_Localize?.context || 'options';

	return (
		<div className="">
			{context !== 'settings' && (
				<h1 className="spoa-ignore-preflight spoa-font-[600] spoa-text-[16px] spoa-p-x-page-default spoa-bg-white spoa-m-0 spoa-py-[18px]">
					{getPageTitle()}
				</h1>
			)}
			<div className="spoa-mt-2 spoa-p-x-page-default">
				<Outlet />
			</div>
		</div>
	);
};

export default ClassicLayout;
