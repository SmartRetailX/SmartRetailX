import { z } from 'zod';

export const signInSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type SignInSchema = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  age: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || Number.isInteger(Number(value)), 'Age must be a whole number')
    .refine((value) => !value || Number(value) >= 0, 'Age cannot be negative'),
  gender: z.union([z.literal('Male'), z.literal('Female')]).optional(),
  City: z.string().trim().min(1, 'City is required'),
  mobileNumber: z.string().trim().optional(),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;
