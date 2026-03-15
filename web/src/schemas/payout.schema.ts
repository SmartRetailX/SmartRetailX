import * as z from 'zod';

import { PayoutGroupType } from '@/types/payout';

// Pyout Schema
export const payoutSchema = z.object({
  payeeId: z.string().min(1, 'Payee ID is required'),
  seasonId: z.string().min(1, 'Season ID is required'),
});

// Generate all Payouts Schema
export const generateAllPayoutsSchema = z.object({
  seasonId: z.string().min(1, 'Season ID is required'),
});
export type GenerateAllPayoutsSchema = z.infer<typeof generateAllPayoutsSchema>;

export const createPayoutSchema = payoutSchema;
export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;

// Delete Payout Schema
export const payoutDeleteSchema = z.object({
  reason: z.string().min(1, 'Reason for cancellation is required'),
});

export const deletePayoutSchema = payoutDeleteSchema;
export type DeletePayoutInput = z.infer<typeof deletePayoutSchema>;

// Payout Group Schemas
export const amountRangeSchema = z
  .object({
    from: z.number().optional(),
    to: z.number().optional(),
  })
  .refine((r) => r.from !== undefined || r.to !== undefined, {
    message: 'At least one of from or to is required',
  });

const basePayoutGroupSchema = {
  name: z.string().min(1, 'Group name is required').max(255, 'Name too long'),
  isActive: z.boolean().optional(),
};

export const createPayoutGroupSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(PayoutGroupType.COUNTRY),
    ...basePayoutGroupSchema,
    countryValues: z.array(z.string()).min(1, 'At least one country is required'),
  }),

  z.object({
    type: z.literal(PayoutGroupType.CURRENCY),
    ...basePayoutGroupSchema,
    currencyValues: z.array(z.string()).min(1, 'At least one currency is required'),
  }),

  z.object({
    type: z.literal(PayoutGroupType.AMOUNT),
    ...basePayoutGroupSchema,
    range: amountRangeSchema,
  }),

  z.object({
    type: z.literal(PayoutGroupType.CUSTOM),
    ...basePayoutGroupSchema,
    payeeIds: z.array(z.string()).min(1, 'At least one payee is required'),
  }),
]);

const baseUpdateSchema = {
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
};

export const updatePayoutGroupSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(PayoutGroupType.COUNTRY),
    ...baseUpdateSchema,
    countryValues: z.array(z.string()).min(1).optional(),
  }),

  z.object({
    type: z.literal(PayoutGroupType.CURRENCY),
    ...baseUpdateSchema,
    currencyValues: z.array(z.string()).min(1).optional(),
  }),

  z.object({
    type: z.literal(PayoutGroupType.AMOUNT),
    ...baseUpdateSchema,
    range: amountRangeSchema.optional(),
  }),

  z.object({
    type: z.literal(PayoutGroupType.CUSTOM),
    ...baseUpdateSchema,
    payeeIds: z.array(z.string()).min(1).optional(),
  }),
]);

export type CreatePayoutGroupInput = z.infer<typeof createPayoutGroupSchema>;
export type UpdatePayoutGroupInput = z.infer<typeof updatePayoutGroupSchema>;
