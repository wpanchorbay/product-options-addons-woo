import { HashRouter, Routes, Route } from 'react-router-dom';
import { WpabProvider } from './store/wpabStore';
import { ToastProvider } from './store/toast/use-toast';
import AddonList from './pages/AddonList';
import AddonBuilder from './pages/AddonBuilder';
import { ToastContainer } from './components/common/ToastContainer';
import { useMenuSync } from './utils/useMenuSync';
import { ClassicLayout } from './components/classics';

function OptionsApp() {
	return (
		<WpabProvider>
			<ToastProvider>
				<ToastContainer />
				<HashRouter>
					<MenuSyncProvider>
						<Routes>
							<Route element={ <ClassicLayout /> }>
								<Route
									path="option-groups"
									element={ <AddonList /> }
								/>
								<Route path="" element={ <AddonList /> } />
								<Route
									path="option-groups/new"
									element={ <AddonBuilder /> }
								/>
								<Route
									path="option-groups/:id"
									element={ <AddonBuilder /> }
								/>
							</Route>
						</Routes>
					</MenuSyncProvider>
				</HashRouter>
			</ToastProvider>
		</WpabProvider>
	);
}

const MenuSyncProvider = ( { children }: { children: React.ReactNode } ) => {
	useMenuSync();
	return <>{ children }</>;
};

export default OptionsApp;
