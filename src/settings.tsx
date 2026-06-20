import { createRoot } from 'react-dom/client';
import './styles/index.scss';
import SettingsApp from './SettingsApp';

const rootElement = document.getElementById( 'optionbay-product-options-addons-woo' );
if ( rootElement ) {
	createRoot( rootElement ).render( <SettingsApp /> );
}
