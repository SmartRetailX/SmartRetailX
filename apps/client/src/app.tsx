import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoutes } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { appRoutes } from './routes';
import { useThemeStore } from './stores/appStore';
import WebSocketDebugger from './components/WebSocketDebugger';

function AppRoutes() {
  return useRoutes(appRoutes);
}

function App() {
  const { theme } = useThemeStore();
  const { i18n } = useTranslation();

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Apply language direction
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppRoutes />
        <WebSocketDebugger />
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
