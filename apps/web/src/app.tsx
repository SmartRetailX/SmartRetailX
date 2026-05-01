import '@/styles/globals.css';

import { useAuth } from '@/hooks';
import { router } from '@/router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { FullScreenLoader } from '@/components/system/loaders/full-screen';
import { ThemeProvider } from '@/components/theme/theme-provider';

import { USER_ROLE } from './types/auth';

export function App() {
  const auth = useAuth();

  if (auth.isPending) {
    return <FullScreenLoader />;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme={auth.user?.role === USER_ROLE.ADMIN ? undefined : 'light'}
      enableSystem
    >
      <RouterProvider router={router} context={{ auth }} />
      <TanStackRouterDevtools router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </ThemeProvider>
  );
}

export default App;
