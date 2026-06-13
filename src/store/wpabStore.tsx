import React, {
	createContext,
	useContext,
	ReactNode,
	useState,
	useEffect,
	useRef,
} from 'react';
import apiFetch from '@wordpress/api-fetch';
import { PluginSettings, PluginStore } from '../utils/types';
import { date, getSettings as getDateSettings } from '@wordpress/date';

interface WpabStoreContextType {
	store: PluginStore;
	updateStore: < K extends keyof PluginStore >(
		key: K,
		value: PluginStore[ K ]
	) => void;
	updateSettings: < K extends keyof PluginSettings >(
		key: K,
		value: PluginSettings[ K ]
	) => void;
	serverDate: Date;
	serverDateLoaded: boolean;
}

const WpabStoreContext = createContext< WpabStoreContextType | null >( null );

declare const spoaPlugin_Localize: PluginStore;

export const WpabProvider: React.FC< { children: ReactNode } > = ( {
	children,
} ) => {
	const initialValue: PluginStore =
		typeof spoaPlugin_Localize !== 'undefined'
			? spoaPlugin_Localize
			: ( {} as PluginStore );

	const [ store, setStore ] = useState< PluginStore >( initialValue );
	const isInitialized = useRef( false );

	const [ serverDate, setServerDate ] = useState( new Date() );
	const [ serverDateLoaded, setServerDateLoaded ] =
		useState< boolean >( false );

	const { timezone } = getDateSettings();
	useEffect( () => {
		const updateServerTime = () => {
			const format = `${ store.wpSettings?.dateFormat } ${ store.wpSettings?.timeFormat }`;
			const localNow = new Date();
			const dateString = date( format, localNow, timezone?.offset );
			const d = new Date( dateString );

			if ( ! isNaN( d.getTime() ) ) {
				setServerDate( d );
				if ( ! serverDateLoaded ) {
					setServerDateLoaded( true );
				}
			}
		};

		updateServerTime();
		const timer = setInterval( updateServerTime, 60000 );
		return () => clearInterval( timer );
	}, [ store.wpSettings, timezone ] );

	// Setup API fetch middleware only once
	useEffect( () => {
		if ( ! isInitialized.current ) {
			apiFetch.use(
				apiFetch.createNonceMiddleware( initialValue.nonce )
			);
			apiFetch.use(
				apiFetch.createRootURLMiddleware( initialValue.rest_url )
			);
			isInitialized.current = true;
		}
	}, [ initialValue.nonce, initialValue.rest_url ] );

	const updateStore = < K extends keyof PluginStore >(
		key: K,
		value: PluginStore[ K ]
	) => {
		setStore( ( prev ) => ( {
			...prev,
			[ key ]: value,
		} ) );
	};

	const updateSettings = < K extends keyof PluginSettings >(
		key: K,
		value: PluginSettings[ K ]
	) => {
		setStore( ( prev ) => ( {
			...prev,
			plugin_settings: {
				...prev.plugin_settings,
				[ key ]: value,
			},
		} ) );
	};

	const contextValue: WpabStoreContextType = {
		store,
		updateStore,
		updateSettings,
		serverDate,
		serverDateLoaded,
	};

	return (
		<WpabStoreContext.Provider value={ contextValue }>
			{ children }
		</WpabStoreContext.Provider>
	);
};

export const useWpabStore = (): PluginStore => {
	const context = useContext( WpabStoreContext );

	if ( ! context ) {
		throw new Error( 'useWpabStore must be used within a WpabProvider' );
	}

	return context.store;
};

export const useWpabStoreActions = () => {
	const context = useContext( WpabStoreContext );

	if ( ! context ) {
		throw new Error(
			'useWpabStoreActions must be used within a WpabProvider'
		);
	}

	return {
		store: context.store,
		updateStore: context.updateStore,
		updateSettings: context.updateSettings,
		serverDate: context.serverDate,
		serverDateLoaded: context.serverDateLoaded,
	};
};

export default WpabStoreContext;
