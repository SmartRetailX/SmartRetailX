import '@/styles/globals.css';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { createAppRouter } from '@/router';
import { RouterProvider } from '@tanstack/react-router';

import { ThemeProvider } from '@/components/theme-provider';

/**
 * Router wrapper that provides auth context to routes
 */
function RouterWrapper() {
  const auth = useAuth();
  const router = createAppRouter(auth);

  return <RouterProvider router={router} />;
}

/**
 * App - Root component
 */
const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <RouterWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
