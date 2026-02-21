import * as React from 'react';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import type { AuthContextType } from '@/types/auth';

interface MyRouterContext {
  auth: AuthContextType;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
