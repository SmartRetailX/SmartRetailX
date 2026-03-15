import { createRootRouteWithContext } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { AuthUIProvider } from '@/providers/auth-ui-provider';
import { Layout } from '@/routes/-layout';
import { RouterContext } from '@/types/router-context';

function RootComponent() {
  return (
    <AuthUIProvider>
      <Layout />
      <Toaster richColors position='bottom-right' closeButton expand={false} className='z-50' />
    </AuthUIProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});
