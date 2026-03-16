import { useAuth } from '@/hooks';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { Layout } from '@/components/partials/layout';
import { RouterContext } from '@/types/router-context';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const { user, isAuthenticated, signOut } = useAuth();

  return (
    <Layout user={user} isAuthenticated={isAuthenticated} signOut={signOut}>
      <Outlet />
    </Layout>
  );
}
