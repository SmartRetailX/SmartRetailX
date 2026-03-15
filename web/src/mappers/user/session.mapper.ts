import { USER_ROLE } from '@/constants';
import { SessionResponse, UserResponse } from '@/schemas/auth/session.response';
import { Session, User } from '@/types';

export const mapSession = (
  session: {
    user: UserResponse;
    session: SessionResponse;
  } | null,
): {
  user: User;
  session: Session;
} | null => {
  if (!session) return null;

  return {
    user: {
      ...session.user,
      role: session.session.role ?? USER_ROLE.GUEST,
      image: session.user.image ?? undefined,
      organizationId: session.session.activeOrganizationId ?? null,
      permissions: session.session.permissions ?? null,
    },
    session: {
      ...session.session,
    },
  };
};
