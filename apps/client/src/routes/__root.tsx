import * as React from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { env } from '@/lib/env';

export const Route = createRootRoute({
  component: RootComponent,
  beforeLoad: ({ context }) => {
    return context;
  },
});

function RootComponent() {
  return (
    <React.Fragment>
      <Outlet />
      {/* DevTools are automatically tree-shaken in production */}
     
    </React.Fragment>
  );
}
