/**
 * auth.queries.ts
 *
 * React Query hooks for authentication, built on top of Better Auth.
 * Better Auth uses HttpOnly session cookies – there is NO token in localStorage.
 *
 * The primary auth state is managed by AuthProvider / useAuth().
 * Use these hooks when you need:
 *   - mutation callbacks (onSuccess / onError) wired into React Query
 *   - query cache invalidation on login/logout
 *   - integration with React Query DevTools
 */

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { auth, type Session, type User } from '@/lib/auth-client';

import { queryClient } from './query-client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

// ---------------------------------------------------------------------------
// Session query
// ---------------------------------------------------------------------------

/**
 * Fetch and cache the current Better Auth session.
 * Returns `null` when unauthenticated (no cookie / expired session).
 */
export function useSessionQuery(
  options?: Omit<UseQueryOptions<Session, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Session, Error>({
    queryKey: authKeys.session(),
    queryFn: async () => {
      const result = await auth.getSession();
      return result.data ?? null;
    },
    staleTime: 1000 * 60 * 5, // consider fresh for 5 min
    retry: false, // do not retry on 401
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Login mutation
// ---------------------------------------------------------------------------

interface LoginInput {
  email: string;
  password: string;
}

/**
 * Sign in with email + password via Better Auth.
 * On success the server sets an HttpOnly session cookie automatically.
 */
export function useLoginMutation(
  options?: UseMutationOptions<
    NonNullable<Awaited<ReturnType<typeof auth.signIn>>['data']>,
    Error,
    LoginInput
  >,
) {
  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const result = await auth.signIn(data);
      if (result.error) {
        throw new Error(result.error.message ?? 'Login failed');
      }
      if (!result.data) throw new Error('Login succeeded but returned no session data');
      return result.data;
    },
    onSuccess: (data, variables, context) => {
      // Refresh cached session so everything that depends on useSessionQuery
      // or useAuth() is immediately up to date.
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Signup mutation
// ---------------------------------------------------------------------------

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Register a new user via Better Auth.
 * On success the server sets an HttpOnly session cookie automatically.
 */
export function useSignupMutation(
  options?: UseMutationOptions<
    NonNullable<Awaited<ReturnType<typeof auth.signUp>>['data']>,
    Error,
    SignupInput
  >,
) {
  return useMutation({
    mutationFn: async (data: SignupInput) => {
      const result = await auth.signUp(data);
      if (result.error) {
        throw new Error(result.error.message ?? 'Sign up failed');
      }
      if (!result.data) throw new Error('Sign up succeeded but returned no session data');
      return result.data;
    },
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Logout mutation
// ---------------------------------------------------------------------------

/**
 * Sign out the current user via Better Auth.
 * The server clears the session cookie; the client clears all React Query caches.
 */
export function useLogoutMutation(options?: UseMutationOptions<void, Error, void>) {
  return useMutation({
    mutationFn: async () => {
      const result = await auth.signOut();
      if (result.error) {
        throw new Error(result.error.message ?? 'Logout failed');
      }
    },
    onSuccess: (data, variables, context) => {
      // Clear the entire query cache so no stale authenticated data remains.
      queryClient.clear();
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Update profile mutation
// ---------------------------------------------------------------------------

/**
 * Update the current user's profile (name / avatar).
 */
export function useUpdateProfileMutation(
  options?: UseMutationOptions<
    NonNullable<Awaited<ReturnType<typeof auth.updateUser>>['data']>,
    Error,
    { name?: string; image?: string }
  >,
) {
  return useMutation({
    mutationFn: async (data: { name?: string; image?: string }) => {
      const result = await auth.updateUser(data);
      if (result.error) {
        throw new Error(result.error.message ?? 'Profile update failed');
      }
      if (!result.data) throw new Error('Profile update succeeded but returned no data');
      return result.data;
    },
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session() });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Re-export User type for consumers
// ---------------------------------------------------------------------------

export type { User, Session };
