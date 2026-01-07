import {
  authService,
  type AuthResponse,
  type LoginRequest,
  type SignupRequest,
} from '@/services/auth.service';
import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { queryClient } from './query-client';

// Define User type
interface User {
  id: string;
  name: string;
  email: string;
}

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
};

/**
 * Hook for user login
 */
export function useLogin(options?: UseMutationOptions<AuthResponse, Error, LoginRequest>) {
  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (data: AuthResponse) => {
      // Store token
      localStorage.setItem('auth_token', data.token);
      // Invalidate and refetch current user
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
    ...options,
  });
}

/**
 * Hook for user signup
 */
export function useSignup(options?: UseMutationOptions<AuthResponse, Error, SignupRequest>) {
  return useMutation({
    mutationFn: (data: SignupRequest) => authService.signup(data),
    onSuccess: (data: AuthResponse) => {
      // Store token
      localStorage.setItem('auth_token', data.token);
      // Invalidate and refetch current user
      void queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
    ...options,
  });
}

/**
 * Hook for user logout
 */
export function useLogout(options?: UseMutationOptions<void, Error, void>) {
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear token
      localStorage.removeItem('auth_token');
      // Clear all queries
      queryClient.clear();
    },
    ...options,
  });
}

/**
 * Hook for getting current user
 */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    enabled: !!localStorage.getItem('auth_token'),
    ...options,
  });
}

/**
 * Hook for refreshing token
 */
export function useRefreshToken(options?: UseMutationOptions<{ token: string }, Error, void>) {
  return useMutation({
    mutationFn: () => authService.refreshToken(),
    onSuccess: (data: { token: string }) => {
      localStorage.setItem('auth_token', data.token);
    },
    ...options,
  });
}
