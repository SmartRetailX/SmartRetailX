import * as z from 'zod';

import { ACTION, RESOURCE } from '@/constants/permissions';

// Profile Update schema
export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;
export const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().email('Invalid email address').optional(),
  image: z.any().optional(),
});

// Password Update schema
export type PasswordUpdateSchema = z.infer<typeof passwordUpdateSchema>;
export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const permissionsSchema = z
  .record(z.nativeEnum(RESOURCE), z.array(z.nativeEnum(ACTION)).optional())
  .optional();
// Invite schema
export type InviteSchema = z.infer<typeof inviteSchema>;
export const inviteSchema = z.object({
  email: z.string().email('Invalid email address').nonempty('Email is required'),
  permissions: permissionsSchema,
});
