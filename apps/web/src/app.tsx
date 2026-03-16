import '@/styles/globals.css';

import { useAuth } from '@/hooks';
import { router } from '@/router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { FullScreenLoader } from '@/components/system/loaders/full-screen';
import { ThemeProvider } from '@/components/theme/theme-provider';

export function App() {
  const auth = useAuth();

  if (auth.isPending || auth.isRefetching) {
    return <FullScreenLoader />;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme={auth.user?.role === 'admin' ? undefined : 'light'}
      enableSystem
    >
      <RouterProvider router={router} context={{ auth }} />
      <TanStackRouterDevtools router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </ThemeProvider>
  );
}

export default App;
