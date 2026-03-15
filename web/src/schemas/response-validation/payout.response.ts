import { z } from 'zod';

import { PAYEE_ROLE } from '@/constants';
import { PAYOUT_STATUS } from '@/types/payout';

/**
 * Address — fields are optional because some entries have an empty object.
 */
const AddressSchema = z
  .object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  })
  .passthrough();

/**
 * Payment info
 */
const PaymentInfoSchema = z
  .object({
    address: AddressSchema.optional(),
    taxId: z.string().optional(),
    paypalAddress: z.string().optional(),
    phone: z.string().optional(),
    preferredCurrency: z.string().optional(),
  })
  .passthrough();

/**
 * additionalInformation — flexible: has otherMembers (array of objects)
 * and may include other optional fields such as realName.
 */
const AdditionalInformationSchema = z
  .object({
    otherMembers: z.array(z.record(z.any())).optional(),
    realName: z.string().optional(),
  })
  .passthrough();

/**
 * payeeDetails — nested object describing the payee
 */
const PayeeDetailsSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    meta: z
      .object({
        sourceId: z.string().optional(),
      })
      .passthrough(),
    __v: z.number().optional(),
    additionalInformation: AdditionalInformationSchema.optional(),
    aliases: z.array(z.string()).optional(),
    createdAt: z.string().optional(), // ISO string
    createdBy: z.string().optional(),
    email: z.string().optional().nullable(),
    internalPayee: z.boolean().optional(),
    isHidden: z.boolean().optional(),
    name: z.string(),
    image: z.string().optional().nullable(),
    paymentInfo: PaymentInfoSchema.optional(),
    type: z.nativeEnum(PAYEE_ROLE).catch(PAYEE_ROLE.ARTIST),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
  })
  .passthrough();

/**
 * Single payout entry
 */
const PayoutSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    identifier: z.string(),
    payout_amount: z.coerce.number().catch(0),
    status: z.nativeEnum(PAYOUT_STATUS).catch(PAYOUT_STATUS.CREATED),
    createdAt: z.string().optional().nullable(), // ISO date string
    version: z.coerce.number().catch(1),
  })
  .passthrough();

/**
 * Single payee item in "data"
 */
const PayeeItemSchema = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    totalPayouts: z.coerce.number().catch(0),
    totalAmount: z.coerce.number().catch(0),
    totalGrossEarnings: z.coerce.number().catch(0),
    totalExpenses: z.coerce.number().optional().default(0),
    latestPayoutDate: z.string().optional().nullable(), // ISO date string
    payouts: z.array(PayoutSchema),
    payeeDetails: PayeeDetailsSchema,
  })
  .passthrough();

/**
 * Full API response
 */
export const ApiResponsePayoutsByPayeesSchema = z
  .object({
    data: z.array(PayeeItemSchema),
    total: z.coerce.number().catch(0),
  })
  .passthrough();

/** TypeScript types inferred from schemas */
export type ApiResponsePayoutsByPayees = z.infer<typeof ApiResponsePayoutsByPayeesSchema>;
export type PayeeItem = z.infer<typeof PayeeItemSchema>;
export type Payout = z.infer<typeof PayoutSchema>;
export type PayeeDetails = z.infer<typeof PayeeDetailsSchema>;
