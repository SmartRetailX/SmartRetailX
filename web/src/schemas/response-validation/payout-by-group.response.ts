import { z } from 'zod';

/**
 * Payout summary schema
 */
const payoutSummarySchema = z.object({
  _id: z.string(),
  identifier: z.string(),
  payout_amount: z.number(),
  status: z.string(),
  createdAt: z.string().datetime(),
  version: z.number(),
});

/**
 * Payee details schema
 */
const payeeDetailsSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  type: z.string(),
  image: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  internalPayee: z.boolean().optional(),
  additionalInformation: z
    .object({
      realName: z.string().optional(),
      otherMembers: z.array(z.object({ name: z.string().optional() }).passthrough()).optional(),
    })
    .passthrough()
    .optional(),
  paymentInfo: z
    .object({
      address: z
        .object({
          addressLine1: z.string().optional(),
          addressLine2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .passthrough()
        .optional(),
      taxId: z.string().optional(),
      preferredCurrency: z.string().optional(),
    })
    .passthrough()
    .optional(),
  meta: z
    .object({
      spotifyUri: z.string().nullable().optional(),
      sourceId: z.string().optional(),
    })
    .passthrough()
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  __v: z.number().optional(),
});

/**
 * Payout by group item schema
 */
const payoutByGroupSchema = z.object({
  _id: z.string(),
  totalPayouts: z.number(),
  totalAmount: z.number(),
  totalGrossEarnings: z.number(),
  totalExpenses: z.number(),
  latestPayoutDate: z.string().datetime(),
  payouts: z.array(payoutSummarySchema),
  payeeDetails: payeeDetailsSchema,
});

/**
 * Payouts by group response schema
 */
export const payoutsByGroupResponseSchema = z.object({
  data: z.array(payoutByGroupSchema),
  total: z.number(),
});

export type PayoutsByGroupResponse = z.infer<typeof payoutsByGroupResponseSchema>;
