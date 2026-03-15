import { z } from 'zod';

import { PAYOUT_STATUS } from '@/types/payout';

const payoutUserSchema = z
  .object({
    _id: z.string().optional().default(''),
    email: z.string().optional(),
  })
  .passthrough();

const payoutStatementResponseSchema = z
  .object({
    _id: z.string().optional().default(''),
    originalName: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().optional().default('application/pdf'),
    size: z.number().optional().default(0),
    key: z.string().optional(),
    fileKey: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    uploadedBy: z.string().optional().default(''),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const payoutApiResponseSchema = z
  .object({
    _id: z.string(),
    identifier: z.string(),
    opening_balance: z.number().optional().default(0),
    gross_earnings: z.number().optional().default(0),
    total_expenses: z.number().optional().default(0),
    payout_amount: z.number().optional().default(0),
    payee: z
      .union([z.string(), z.record(z.unknown())])
      .optional()
      .default(''),
    payeeName: z.string().optional().default(''),
    payeeEmail: z.string().optional().nullable(),
    status: z.nativeEnum(PAYOUT_STATUS).optional().default(PAYOUT_STATUS.CREATED),
    rolledPayouts: z.array(z.string()).optional().default([]),
    version: z.number().optional().default(1),
    reason: z.string().optional(),
    createdBy: payoutUserSchema.optional().default({ _id: '', email: '' }),
    updatedBy: payoutUserSchema.optional().default({ _id: '', email: '' }),
    createdAt: z.string(),
    updatedAt: z.string(),
    contracts: z.array(z.record(z.unknown())).optional().default([]),
    transactions: z.array(z.record(z.unknown())).optional().default([]),
    statement: payoutStatementResponseSchema.optional().nullable(),
  })
  .passthrough();

export const payoutListApiResponseSchema = z.array(payoutApiResponseSchema);

export type PayoutApiResponse = z.infer<typeof payoutApiResponseSchema>;
export type PayoutStatementApiResponse = z.infer<typeof payoutStatementResponseSchema>;
