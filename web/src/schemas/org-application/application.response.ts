import z from 'zod';

import { BUSINESS_TYPE } from '@/constants';

import { userBaseSchema } from '../auth';

const applicationSchema = z.object({
  _id: z.string(),

  userId: userBaseSchema
    .pick({
      name: true,
      email: true,
    })
    .extend({
      _id: z.string(),
    }),

  firstName: z.string(),
  lastName: z.string(),
  company: z.string(),
  email: z.string().email(),
  country: z.string().length(2),

  businessType: z.nativeEnum(BUSINESS_TYPE),
  estimatedCatalogueSize: z.enum(['0-500', '500-1000', '1000-5000', '5000-25000', '25000+']),
  estimatedContractCount: z.enum(['0-50', '50-150', '150-250', '250-500', '500-1000', '1000+']),
  frequencyOfReporting: z.enum(['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']),

  approved: z.boolean(),
  pending: z.boolean(),
  rejectionReason: z.string().nullable().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  __v: z.number(),
});

export const applicationsResponseSchema = z.array(applicationSchema);
export type ApplicationsResponse = z.infer<typeof applicationsResponseSchema>;
