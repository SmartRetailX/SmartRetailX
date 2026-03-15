import z from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
export type SignInSchema = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords don't match",
    path: ['passwordConfirmation'], // Path of error
  });
export type SignUpSchema = z.infer<typeof signUpSchema>;

export const twoFactorSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters'),
});
export type TwoFactorSchema = z.infer<typeof twoFactorSchema>;
