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
			return __('New Option Group', 'optionbay-product-options-addons-woo');
		}
		if (path.startsWith('/option-groups/')) {
			return __('Edit Option Group', 'optionbay-product-options-addons-woo');
		}
		if (path === '/' || path === '/option-groups') {
			return __('Option Groups', 'optionbay-product-options-addons-woo');
		}
		if (path === '/settings') {
			return __('Settings', 'optionbay-product-options-addons-woo');
		}
		return store.pluginData?.plugin_name || __('OptionBay - Product Options and Addons', 'optionbay-product-options-addons-woo');
	};

	const context =
		(window as any).spoaPlugin_Localize?.context || 'options';

	return (
		<div className="">
			{context !== 'settings' && (
				<h1 className="wpab-wpoa-ignore-preflight wpab-wpoa-font-[600] wpab-wpoa-text-[16px] wpab-wpoa-p-x-page-default wpab-wpoa-bg-white wpab-wpoa-m-0 wpab-wpoa-py-[18px]">
					{getPageTitle()}
				</h1>
			)}
			<div className="wpab-wpoa-mt-2 wpab-wpoa-p-x-page-default">
				<Outlet />
			</div>
		</div>
	);
};

export default ClassicLayout;
