import { z } from 'zod';

const contractSchema = z.object({
  _id: z.string(),
  isrc: z.string().optional(),
  __v: z.number(),
  catalogNo: z.string().optional(),
  label: z.string(),
  payees: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        split: z.number(),
      }),
    )
    .optional(),
  title: z.string(),
  upc: z.string().optional(),
  version: z.string().optional(),
  image: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contractResponse = contractSchema;
export type ContractResponse = z.infer<typeof contractResponse>;
