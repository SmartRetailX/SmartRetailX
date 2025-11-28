import { routeTree } from '@/routeTree.gen';
import { createRouter } from '@tanstack/react-router';

import { NotFoundPage } from '@/components/not-found/page';
import { DefaultCatchBoundary } from '@/components/states/catch-boundary';
import type { AuthContextType } from '@/types/auth';

/**
 * Router context interface
 * Properly typed with authentication context
 */
export interface RouterContext {
  auth: AuthContextType;
}

export function createAppRouter(auth: AuthContextType) {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    context: {
      auth,
    },
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: NotFoundPage,
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
