import { z } from 'zod';

const userRefSchema = z
  .object({
    _id: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export const expenseCategoryResponseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string(),
  createdBy: userRefSchema.or(z.string()).optional(),
  updatedBy: userRefSchema.or(z.string()).optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const expenseCategoriesResponseSchema = z.array(expenseCategoryResponseSchema);

export type ExpenseCategoryApiResponse = z.infer<typeof expenseCategoryResponseSchema>;
export type ExpenseCategoriesApiResponse = z.infer<typeof expenseCategoriesResponseSchema>;
