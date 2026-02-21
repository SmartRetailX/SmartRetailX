import { QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

/**
 * Determine whether React Query should retry a failed request.
 *
 * Rules:
 * - Never retry on 401 (Unauthorized) – the axios interceptor in api-client.ts
 *   already handles one silent refresh attempt.  A second retry from React Query
 *   would cause duplicate requests and potential redirect loops.
 * - Never retry on 403 (Forbidden) – wrong permissions, retrying won't help.
 * - Never retry on 404 (Not Found) – the resource doesn't exist.
 * - Retry once for all other errors (network glitch, 5xx, etc.).
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  if (status === 401 || status === 403 || status === 404) {
    return false;
  }
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
