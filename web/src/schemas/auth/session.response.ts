import z from 'zod';

import { ACTION, RESOURCE, USER_ROLE } from '@/constants';

/**
 * Enhanced User Schema with Two-Factor Authentication and Passkey Support
 *
 * Validates the user object returned by better-auth with all plugins enabled:
 * - Base user fields (id, email, name, dates)
 * - Two-Factor Authentication fields (twoFactorEnabled, twoFactorSecret, twoFactorBackupCodes)
 * - Email verification (emailVerified)
 * - Passkey support (automatically handled by better-auth)
 */
export const userBaseSchema = z.object({
  // Base user fields (from better-auth)
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // Two-Factor Authentication fields (from twoFactor plugin)
  twoFactorEnabled: z.boolean().optional(),
  twoFactorSecret: z.string().nullable().optional(),
  twoFactorBackupCodes: z.string().nullable().optional(),
});

export const userResponseSchema = userBaseSchema.transform((data) => ({
  ...data,
  twoFactorEnabled: data.twoFactorEnabled ?? false,
}));

export type UserResponse = z.infer<typeof userResponseSchema>;

/**
 * Enhanced Session Schema with Organization and Access Control
 *
 * Validates the session object returned by better-auth with plugins:
 * - Base session fields (id, userId, token, expiration, dates)
 * - Organization fields (activeOrganizationId from organization plugin)
 * - Access control (role, permissions from access plugin)
 * - Session tracking (ipAddress, userAgent)
 */
export const sessionResponseSchema = z.object({
  // Base session fields (from better-auth)
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

  // Organization plugin fields
  activeOrganizationId: z.string().nullable().optional(),

  // Role-based access control (from access/organization plugin)
  role: z.nativeEnum(USER_ROLE).optional(),

  // Permissions object (resource -> actions mapping)
  // Example: { project: ["create", "update"], member: ["create", "read"] }
  permissions: z.record(z.nativeEnum(RESOURCE), z.array(z.nativeEnum(ACTION))).optional(),

  // Session tracking fields
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * Full Session Response Schema
 *
 * Represents the complete session data structure returned by better-auth
 * with all plugins enabled (organization, passkey, twoFactor).
 *
 * This schema validates:
 * - User object with 2FA, passkey, and email verification
 * - Session object with organization membership, role, and permissions
 *
 * Returns null when no active session exists.
 */
export const fullSessionResponseSchema = z
  .object({
    user: userResponseSchema,
    session: sessionResponseSchema,
  })
  .nullable();

export type FullSessionResponse = z.infer<typeof fullSessionResponseSchema>;
