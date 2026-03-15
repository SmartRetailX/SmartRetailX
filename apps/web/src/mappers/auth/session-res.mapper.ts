import { SessionResponse } from '@/schemas/auth/session.response';

import { Session, UserMeta, UserSession } from '@/types/auth';

export function mapUser(user: SessionResponse['user']): UserMeta {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role ?? 'user',
    emailVerified: user.emailVerified ?? false,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
  };
}

export function mapSession(session: SessionResponse['session']): Session {
  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function mapSessionResponse(response: SessionResponse): UserSession {
  return {
    user: mapUser(response.user),
    session: mapSession(response.session),
  };
}
