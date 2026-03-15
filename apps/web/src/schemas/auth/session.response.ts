import { z } from 'zod';

const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    emailVerified: z.boolean(),
    twoFactorEnabled: z.boolean().nullable().optional(),
  }),
  session: z.object({
    id: z.string(),
    userId: z.string(),
    token: z.string(),
    ipAddress: z.string(),
    userAgent: z.string(),
    expiresAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export const sessionResponseSchema = sessionSchema;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
