import { z } from 'zod';

import { PayoutGroupType } from '@/types/payout';

/**
 * Payout Group Response Validation Schema
 * Validates API responses for payout groups from the backend
 */

/** amount range: at least one of `from` or `to` must be provided */
export const amountRangeSchema = z
  .object({
    from: z.number().optional(),
    to: z.number().optional(),
  })
  .refine((r) => r.from !== undefined || r.to !== undefined, {
    message: 'At least one of "from" or "to" is required',
    path: [], // puts the error at the object level; change to ['from'] or ['to'] if you prefer
  });

export const payoutGroupTypeEnum = z.nativeEnum(PayoutGroupType);

const userSchema = z.object({
  _id: z.string(),
  email: z.string(),
  name: z.string().optional(),
});

const payeeSchema = z.object({
  _id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  image: z.string().optional(),
});

/** Shared validation logic for payout group schemas */
const payoutGroupValidation = (
  obj: {
    type: PayoutGroupType;
    range?: { from?: number; to?: number };
    values?: string[];
    payeeIds?: unknown;
  },
  ctx: z.RefinementCtx,
) => {
  if (obj.type === PayoutGroupType.AMOUNT && !obj.range) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`range` is required for payout groups of type "amount"',
      path: ['range'],
    });
  }

  if (obj.type === PayoutGroupType.COUNTRY && !obj.values) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`values` is required for payout groups of type "country"',
      path: ['values'],
    });
  }

  if (obj.type === PayoutGroupType.CURRENCY && !obj.values) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`values` is required for payout groups of type "currency"',
      path: ['values'],
    });
  }

  if (obj.type === PayoutGroupType.CUSTOM && !obj.payeeIds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`payeeIds` is required for payout groups of type "custom"',
      path: ['payeeIds'],
    });
  }
};

/** Base schema for payout group fields */
const basePayoutGroupSchema = z.object({
  _id: z.string(),
  type: payoutGroupTypeEnum,
  name: z.string(),
  isActive: z.boolean().optional(),
  values: z.array(z.string()).optional(),
  range: amountRangeSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: userSchema,
  updatedBy: userSchema,
  __v: z.number().optional(),
});

export const payoutGroupResponseSchema = basePayoutGroupSchema
  .extend({
    payeeIds: z.array(z.string()).optional(),
  })
  .superRefine(payoutGroupValidation);

export const payoutGroupsResponseSchema = z.array(payoutGroupResponseSchema);

/**
 * Payout Group by ID Response Schema
 * Same as payoutGroupResponseSchema but with populated payeeIds
 */
export const payoutGroupByIdResponseSchema = basePayoutGroupSchema
  .extend({
    payeeIds: z.array(payeeSchema).optional(),
  })
  .superRefine(payoutGroupValidation);

export type PayoutGroupResponse = z.infer<typeof payoutGroupResponseSchema>;
export type PayoutGroupsResponse = z.infer<typeof payoutGroupsResponseSchema>;
export type PayoutGroupByIdResponse = z.infer<typeof payoutGroupByIdResponseSchema>;
