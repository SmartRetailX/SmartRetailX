import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { api } from './env';

/**
 * Better Auth client for mobile app
 * Configured with Expo plugin for secure cookie management and deep linking support
 */
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: api.getAuthUrl(),
  plugins: [
    expoClient({
      scheme: 'mobile-app', // Must match the scheme in app.json
      storagePrefix: 'smart-retail-x',
      storage: SecureStore,
    }),
  ],
});

/**
 * Type-safe auth methods for the mobile app
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
};

/**
 * Export types from Better Auth client
 */
export type Session = Awaited<ReturnType<typeof authClient.getSession>>['data'];
export type User = NonNullable<Session>['user'];
