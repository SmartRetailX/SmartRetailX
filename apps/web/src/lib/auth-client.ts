import { twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const baseURL = `${import.meta.env.PUBLIC_BASE_URL}/api/auth`;

export const authClient = createAuthClient({
  baseURL,
  plugins: [twoFactorClient()],
  fetchOptions: {
    credentials: 'include',
  },
});

export const {
  signIn,
  signOut,
  signUp,
  refreshToken,
  useSession,
  getSession,
  updateUser,
  changeEmail,
} = authClient;
