import { z } from 'zod';

const payeeOverviewRoyaltySchema = z
  .object({
    month: z.number(),
    year: z.number(),
    totalEarnings: z.number().optional(),
    earnings: z.number().optional(),
    amount: z.number().optional(),
    totalStreams: z.number().optional(),
    streams: z.number().optional(),
  })
  .passthrough();

export const payeeOverviewSchema = z
  .object({
    totalRoyaltyIncome: z.number(),
    totalExpenseRecovery: z.number(),
    totalPayout: z.number(),
    availableToPay: z.number(),
    totalIncomeFromES: z.number().optional().default(0),
    contractCount: z.number().optional().default(0),
    last3MonthsRoyalties: z.array(payeeOverviewRoyaltySchema).optional().default([]),
  })
  .passthrough();

export const payeeOverviewResponseSchema = z.union([
  payeeOverviewSchema,
  z.object({ data: payeeOverviewSchema }).passthrough(),
]);

export type PayeeOverviewResponse = z.infer<typeof payeeOverviewSchema>;
export type PayeeOverviewApiResponse = z.infer<typeof payeeOverviewResponseSchema>;
