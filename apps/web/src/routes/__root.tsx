import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { RouterContext } from '@/types/router-context';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return <Outlet />;
}
