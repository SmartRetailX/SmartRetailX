import '@/styles/globals.css';

import { createAppRouter } from '@/router';
import { RouterProvider } from '@tanstack/react-router';

import { ThemeProvider } from '@/components/theme-provider';
import type { AuthContextType } from '@/types/auth';

/**
 * Mock auth
 * TODO: Replace auth
 */
const mockAuth: AuthContextType = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  login: async (email: string, password: string) => {
    // Mock login implementation
    console.log('Logging in with', email, password);
  },
  logout: async () => {
    // Mock logout implementation
    console.log('Logging out');
  },
  refreshAuth: async () => {
    // Mock refresh implementation
    console.log('Refreshing auth');
  },
};

// Create router instance once
const router = createAppRouter(mockAuth);

/**
 * App - Root component
 */
const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
