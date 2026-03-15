import { z } from 'zod';

import { PAYEE_ROLE } from '@/constants';

const payeeSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  image: z.string().optional(),
  type: z.nativeEnum(PAYEE_ROLE),
  updatedAt: z.string(),
  createdAt: z.string(),
  __v: z.number(),
});

export const payeeResponse = payeeSchema;
export type PayeeResponse = z.infer<typeof payeeResponse>;
