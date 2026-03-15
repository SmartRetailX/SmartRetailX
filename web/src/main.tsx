import '@/styles/globals.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import React, { Suspense, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { FullScreenLoader } from '@/components/loaders';
import { StateHandler } from '@/components/system/state-handler';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { SocketProvider } from '@/context/socket-context';
import { queryClient } from '@/lib/query-client';

import { router } from './router';

// Main App Component
const App = () => {
  const auth = useAuth();

  const isLoading = auth.isLoading;
  const routerContext = useMemo(() => ({ auth }), [auth]);

  return (
    <ErrorBoundary fallback={<FullScreenLoader />}>
      <Suspense fallback={<FullScreenLoader />}>
        <StateHandler
          isLoading={isLoading}
          isError={auth.isError}
          loadingComponent={<FullScreenLoader />}
        >
          {auth.isAuthenticated ? (
            <SocketProvider>
              <RouterProvider
                router={router}
                context={routerContext}
                defaultPendingComponent={FullScreenLoader}
                defaultPendingMinMs={300}
              />
            </SocketProvider>
          ) : (
            <RouterProvider
              router={router}
              context={routerContext}
              defaultPendingComponent={FullScreenLoader}
              defaultPendingMinMs={300}
            />
          )}
        </StateHandler>
      </Suspense>
    </ErrorBoundary>
  );
};

// Root Component with Providers
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);

  root.render(
    <React.StrictMode>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
            <ReactQueryDevtools
              position='left'
              buttonPosition='bottom-right'
              initialIsOpen={false}
            />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}
