import type { ACTION, RESOURCE, USER_ROLE } from '@/constants';

export type Resource = (typeof RESOURCE)[keyof typeof RESOURCE];
export type Action = (typeof ACTION)[keyof typeof ACTION];
export type Permissions = Partial<Record<Resource, Action[]>>;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string;
  organizationId: string | null;
  permissions: Permissions | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  token: string;
  ipAddress?: string | null;
  userId: string;
  userAgent?: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreatedBy = {
  id: string;
  email: string;
  name: string;
  image?: string;
};

export type UpdatedBy = {
  id: string;
  email: string;
  name: string;
  image?: string;
};

export type UploadedBy = {
  id: string;
  email: string;
  name: string;
};

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
