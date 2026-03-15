import * as z from 'zod';

import { BUSINESS_TYPE } from '@/constants';

const organizationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().min(1, 'Company name is required'),
  email: z.string().email('Email must be a valid email address'),
  country: z.string().min(1, 'Country is required'),
  businessType: z.nativeEnum(BUSINESS_TYPE, {
    errorMap: () => ({ message: 'Please select a valid organization type' }),
  }),
  estimatedCatalogueSize: z.enum(['0-500', '500-1000', '1000-5000', '5000-25000', '25000+'], {
    errorMap: () => ({
      message: 'Please select a valid catalogue size',
    }),
  }),
  estimatedContractCount: z.enum(['0-50', '50-150', '150-250', '250-500', '500-1000', '1000+'], {
    errorMap: () => ({
      message: 'Please select a valid contract count',
    }),
  }),
  frequencyOfReporting: z.enum(['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'], {
    errorMap: () => ({
      message: 'Please select a valid reporting frequency',
    }),
  }),
});

export const createOrganizationSchema = organizationSchema;
export type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>;
