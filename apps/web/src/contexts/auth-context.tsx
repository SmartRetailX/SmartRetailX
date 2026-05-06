import { createContext, useMemo, type ReactNode } from 'react';
import { mapSessionResponse } from '@/mappers/auth/session-res.mapper';
import { sessionResponseSchema } from '@/schemas/auth/session.response';

import { authClient, signIn, signOut, signUp, useSession } from '@/lib/auth-client';
import { Session, UserMeta } from '@/types/auth';

type UseSessionResult = ReturnType<typeof useSession>;

export type AuthContextValue = {
  user: UserMeta | null;
  session: Session | null;
  fullSession: UseSessionResult['data'];
  isPending: boolean;
  isRefetching: boolean;
  error: UseSessionResult['error'];
  isAuthenticated: boolean;
  signIn: typeof signIn;
  signOut: typeof signOut;
  signUp: typeof signUp;
  authClient: typeof authClient;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, isRefetching, error } = useSession();

  const fullSession = useMemo(() => {
    if (!data) return null;

    const result = sessionResponseSchema.safeParse(data);

    if (!result.success) {
      console.error('Invalid session data:', result.error);
      return null;
    }

    return mapSessionResponse(result.data);
  }, [data, isPending, isRefetching]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: fullSession?.user ?? null,
      session: fullSession?.session ?? null,
      fullSession,
      isPending,
      isRefetching,
      error,
      isAuthenticated: !!fullSession?.user,
      signIn,
      signOut,
      signUp,
      authClient,
    }),
    [fullSession, isPending, isRefetching, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
