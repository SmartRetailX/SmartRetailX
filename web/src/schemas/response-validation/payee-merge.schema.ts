import z from 'zod';

import { PAYEE_ROLE } from '@/constants';
import { EXPENSE_STATUS } from '@/types/expense';

const basePayeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  image: z.string().optional(),
  paymentInfo: z
    .object({
      address: z.object({}).optional(),
      preferredCurrency: z.string().optional(),
    })
    .optional(),
  aliases: z.array(z.string()).optional(),
  type: z.nativeEnum(PAYEE_ROLE),
  contractsCount: z.number(),
  totalRemainingObligations: z.number().optional(),
  payableRoyalties: z.number().optional(),
});

const masterPayeeSchema = basePayeeSchema;
const mergePayeeSchema = basePayeeSchema;

const impactSchema = z.object({
  contractsToUpdate: z.array(
    z.object({
      id: z.string(),
      isrc: z.string(),
      label: z.object({
        _id: z.string(),
        name: z.string(),
      }),
      payeeCount: z.number(),
      releaseDate: z.string().optional(),
      releaseTitle: z.string().optional(),
      upc: z.string().optional(),
      image: z.string().optional(),
    }),
  ),
  expensesToUpdate: z.array(
    z.object({
      expense: z.object({
        _id: z.string(),
        amount: z.number(),
        payee: z.object({
          _id: z.string(),
          email: z.string().optional(),
          name: z.string(),
        }),
        label: z.object({
          _id: z.string(),
          name: z.string(),
        }),
        reference: z.string().optional(),
        status: z.nativeEnum(EXPENSE_STATUS),
      }),
      totalOwed: z.number(),
      totalPaid: z.number(),
      remainingAmount: z.number(),
    }),
  ),
  totalRemainingObligations: z.number(),
  linkedPayeesCount: z.number(),
});

export const mergePreviewResponseSchema = z.object({
  masterPayee: masterPayeeSchema,
  mergePayee: mergePayeeSchema,
  impact: impactSchema,
});

export type MergePreviewResponse = z.infer<typeof mergePreviewResponseSchema>;
