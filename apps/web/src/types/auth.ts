export const USER_ROLE = {
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string;
}

export interface UserMeta extends User {
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  user: UserMeta;
  session: Session;
}
