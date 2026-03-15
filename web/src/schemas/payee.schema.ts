import * as z from 'zod';

import { PAYEE_ROLE } from '@/constants';

// Payee schema
export type PayeeSchemaType = z.infer<typeof payeeSchema>;
export const payeeSchema = z.object({
  name: z.string().min(1, 'Payee name is required'),

  aliases: z.array(z.string()).optional(),

  email: z.string().email('Invalid email address').nonempty('Email is required'),

  type: z.nativeEnum(PAYEE_ROLE, {
    errorMap: () => ({ message: 'Payee type is required' }),
  }),

  additionalInformation: z
    .object({
      realName: z.string().optional(),
      publishingAffiliation: z.string().optional(),
      otherMembers: z
        .array(
          z.object({
            name: z.string().min(1, 'Member name is required'),
            publishingAffiliation: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),

  social: z
    .object({
      facebook: z.string().url('Invalid Facebook URL').optional(),
      instagram: z.string().url('Invalid Instagram URL').optional(),
      twitter: z.string().url('Invalid Twitter URL').optional(),
    })
    .optional(),

  storeProfile: z
    .object({
      spotify: z.string().url('Invalid Spotify URL').optional(),
      youtube: z.string().url('Invalid YouTube URL').optional(),
      appleMusic: z.string().url('Invalid Apple Music URL').optional(),
      deezer: z.string().url('Invalid Deezer URL').optional(),
    })
    .optional(),

  paymentInfo: z
    .object({
      taxId: z.string().optional(),
      paypalAddress: z.string().email('Invalid PayPal email').optional(),
      preferredCurrency: z.string().optional(),
      phone: z.string().optional(),
      address: z
        .object({
          companyName: z.string().optional(),
          addressLine1: z.string().optional(),
          addressLine2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),

  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

// Payee update schema
export type PayeeUpdateSchema = z.infer<typeof payeeUpdateSchema>;
export const payeeUpdateSchema = z.object({
  name: z.string().min(1, 'Payee name is required'),
  email: z.string().email('Invalid email address').nonempty('Email is required'),
  type: z.nativeEnum(PAYEE_ROLE, {
    errorMap: () => ({ message: 'Payee type is required' }),
  }),
  spotifyUri: z.string().optional(),
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Status is required' }),
  }),
});
