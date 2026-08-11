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
		(window as any).opopwPluginLocalize?.context || 'options';

	return (
		<div className="">
			{context !== 'settings' && (
				<h1 className="opopw-ignore-preflight opopw-font-[600] opopw-text-[16px] opopw-p-x-page-default opopw-bg-white opopw-m-0 opopw-py-[18px]">
					{getPageTitle()}
				</h1>
			)}
			<div className="opopw-mt-2 opopw-p-x-page-default">
				<Outlet />
			</div>
		</div>
	);
};

export default ClassicLayout;
