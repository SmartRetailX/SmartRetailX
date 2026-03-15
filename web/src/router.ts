import { createRouter } from '@tanstack/react-router';

import type { RouterContext as AppRouterContext } from '@/types/router-context';

import { FullScreenLoader } from './components/loaders';
import { routeTree } from './routeTree.gen';

// Create a new router instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultPendingComponent: FullScreenLoader,
  defaultPendingMinMs: 300,
  context: {
    auth: undefined!,
    user: undefined!,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }

  type RouterContext = AppRouterContext;
}
