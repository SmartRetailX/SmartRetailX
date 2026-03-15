import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { handleApiError } from '@/utils/error-handler';

/**
 * Default error handler for React Query operations
 * This ensures consistent error formats across all query and mutation operations
 */
const defaultErrorHandler = (error: unknown) => {
  // Just normalize the error but don't show UI feedback
  // Components will handle UI feedback using useApiError hook
  return handleApiError(error);
};

// Create caches with error handlers
const queryCache = new QueryCache({
  onError: defaultErrorHandler,
});

const mutationCache = new MutationCache({
  onError: defaultErrorHandler,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      // No default error handler at this level
    },
  },
  queryCache,
  mutationCache,
});
