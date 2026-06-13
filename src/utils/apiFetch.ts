// src/utils/apiFetch.ts

import apiFetch from '@wordpress/api-fetch';
import { PluginStore } from './types';

declare global {
	interface Window {
		/**
		 * The main data object localized from PHP by wp_localize_script.
		 */
		spoaPlugin_Localize?: PluginStore;
	}
}
// Get the nonce and root URL that we localized from PHP.
const { nonce, rest_url: restUrl } = window?.spoaPlugin_Localize || {};
if ( nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
}
if ( restUrl ) {
	apiFetch.use( apiFetch.createRootURLMiddleware( restUrl ) );
}

export default apiFetch;
