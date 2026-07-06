import { createRoot } from 'react-dom/client';
import './styles/index.scss';
import OptionsApp from './OptionsApp';
import { useAddonContext } from './store/AddonContext';
import { ClassicMultiSelect } from './components/classics/ClassicMultiSelect';
import { ClassicSettingsTable } from './components/classics/ClassicSettingsTable';
import { renderProductOption } from './components/addonBuilder/utils';
import { FormError } from './components/addonBuilder/FormError';

// Expose internal dependencies to Pro plugin
(window as any).opopw = {
	useAddonContext,
	ClassicMultiSelect,
	ClassicSettingsTable,
	renderProductOption,
	FormError
};

const rootElement = document.getElementById( 'optionbay-product-options-addons-woo' );
if ( rootElement ) {
	createRoot( rootElement ).render( <OptionsApp /> );
}
