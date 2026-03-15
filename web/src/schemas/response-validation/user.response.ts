import { z } from 'zod';

const userSchema = z.object({
  _id: z.string(),
  userId: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  image: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  __v: z.number().optional(),
});

export const createdByResponse = userSchema.omit({
  userId: true,
  createdAt: true,
  updatedAt: true,
  __v: true,
});
export type CreatedByResponse = z.infer<typeof createdByResponse>;
export const uploadedByResponse = userSchema;
export type UploadedByResponse = z.infer<typeof uploadedByResponse>;
