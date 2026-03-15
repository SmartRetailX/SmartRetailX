import { z } from 'zod';

// Email validation schema
export const emailSchema = z.object({
  email: z.string().email('Invalid email address').nonempty('Email is required'),
});
export type EmailSchema = z.infer<typeof emailSchema>;
