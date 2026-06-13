import { WpabProvider } from "./store/wpabStore";
import { ToastProvider } from "./store/toast/use-toast";
import Settings from "./pages/Settings";
import { ToastContainer } from "./components/common/ToastContainer";

function SettingsApp() {
  return (
    <WpabProvider>
      <ToastProvider>
        <ToastContainer />
        <div className="spoa-mt-2">
          <Settings />
        </div>
      </ToastProvider>
    </WpabProvider>
  );
}

export default SettingsApp;
