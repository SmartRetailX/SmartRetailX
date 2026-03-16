import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { Layout } from '@/components/partials/layout';
import { RouterContext } from '@/types/router-context';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
