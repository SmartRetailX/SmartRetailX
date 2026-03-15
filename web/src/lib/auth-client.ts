import { passkeyClient } from '@better-auth/passkey/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth Client Configuration
 *
 * This client is configured to use Better Auth default endpoints
 * on the backend (`/api/auth/*`).
 *
 * The backend auth service handles the actual authentication logic,
 * and this client communicates with it via HTTP requests.
 *
 * Uses HTTP-only cookies for session management
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_BASE_URL,
  fetchOptions: {
    onSuccess(ctx) {
      const authToken = ctx.response.headers.get('set-auth-token');
      if (authToken) {
        localStorage.setItem('bearer_token', authToken);
      }
    },
    onError(context) {
      if (context.response.status === 401) {
        localStorage.removeItem('bearer_token');
      }
      throw new Error(context.error?.message || 'Authentication error');
    },
    credentials: 'include', // Enable sending cookies with requests
  },
  plugins: [passkeyClient(), twoFactorClient()],
});

/**
 * Export common auth methods for easy access throughout the app
 *
 * Note: Import these directly where needed instead of passing through React context
 * to avoid serialization issues with React DevTools.
 *
 * @example
 * import { organization } from '@/lib/auth-client';
 * await organization.create({ name: 'My Org' });
 */
export const { useSession, signIn, signUp } = authClient;
