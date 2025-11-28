import { createAuthClient } from 'better-auth/client';

/**
 * Better Auth client configuration
 * This is used by the frontend to communicate with the auth service
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api/auth',

  // Include credentials (cookies) in requests
  credentials: 'include',
});

/**
 * Type-safe auth client methods
 */
export const auth = {
  /**
   * Sign up a new user
   */
  signUp: async (data: { email: string; password: string; name: string }) => {
    return authClient.signUp.email(data);
  },

  /**
   * Sign in with email and password
   */
  signIn: async (data: { email: string; password: string }) => {
    return authClient.signIn.email(data);
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    return authClient.signOut();
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    return authClient.getSession();
  },

  /**
   * Update user profile
   */
  updateUser: async (data: { name?: string; image?: string }) => {
    return authClient.updateUser(data);
  },

  /**
   * Request password reset
   */
  forgetPassword: async (email: string) => {
    return authClient.forgetPassword({ email });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: { token: string; password: string }) => {
    return authClient.resetPassword(data);
  },
};

/**
 * Export types from Better Auth client
 */
export type Session = Awaited<ReturnType<typeof authClient.getSession>>['data'];
export type User = NonNullable<Session>['user'];
