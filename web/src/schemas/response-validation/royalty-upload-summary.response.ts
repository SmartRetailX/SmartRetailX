import { z } from 'zod';

const baseMetricsSchema = z.object({
  earnings: z.number(),
  streams: z.number(),
});

const contractMetaSchema = z
  .object({
    _id: z.string().optional(),
    title: z.string().optional(),
    isrc: z.string().optional(),
    upc: z.string().optional(),
    mix: z.string().optional(),
  })
  .passthrough();

const payeeMetaSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    image: z.string().optional(),
  })
  .passthrough();

const withDataWrapper = <TSchema extends z.ZodTypeAny>(schema: TSchema) =>
  z.union([schema, z.object({ data: schema }).passthrough()]);

export const royaltyUploadSummaryOverviewSchema = z.object({
  totalEarnings: z.number(),
  totalStreams: z.number(),
  royaltiesCount: z.number(),
});

const royaltyUploadSummaryContractSchema = baseMetricsSchema.extend({
  dsps: z.array(
    z.object({
      dsp: z.string(),
      earnings: z.number(),
      streams: z.number(),
    }),
  ),
  contract: contractMetaSchema,
  isrc: z.string(),
});

const royaltyUploadSummaryDspSchema = baseMetricsSchema.extend({
  dsp: z.string(),
});

const royaltyUploadSummaryCountrySchema = baseMetricsSchema.extend({
  country: z.string(),
});

const royaltyUploadSummaryPayeeContractSchema = z.object({
  isrc: z.string(),
  contract: contractMetaSchema,
  earnings: z.number(),
});

const royaltyUploadSummaryPayeeSchema = z.object({
  payee: payeeMetaSchema,
  earnings: z.number(),
  contracts: z.array(royaltyUploadSummaryPayeeContractSchema),
});

export const royaltyUploadSummaryOverviewResponseSchema = withDataWrapper(
  royaltyUploadSummaryOverviewSchema,
);
export const royaltyUploadSummaryContractResponseSchema = withDataWrapper(
  z.array(royaltyUploadSummaryContractSchema),
);
export const royaltyUploadSummaryDspResponseSchema = withDataWrapper(
  z.array(royaltyUploadSummaryDspSchema),
);
export const royaltyUploadSummaryCountryResponseSchema = withDataWrapper(
  z.array(royaltyUploadSummaryCountrySchema),
);
export const royaltyUploadSummaryPayeeResponseSchema = withDataWrapper(
  z.array(royaltyUploadSummaryPayeeSchema),
);

export const getRoyaltyUploadSummarySchema = (type?: 'payee' | 'contract' | 'dsp' | 'country') => {
  switch (type) {
    case 'contract':
      return royaltyUploadSummaryContractResponseSchema;
    case 'dsp':
      return royaltyUploadSummaryDspResponseSchema;
    case 'country':
      return royaltyUploadSummaryCountryResponseSchema;
    case 'payee':
      return royaltyUploadSummaryPayeeResponseSchema;
    default:
      return royaltyUploadSummaryOverviewResponseSchema;
  }
};

export type RoyaltyUploadSummaryOverviewResponse = z.infer<
  typeof royaltyUploadSummaryOverviewResponseSchema
>;
export type RoyaltyUploadSummaryContractResponse = z.infer<
  typeof royaltyUploadSummaryContractResponseSchema
>;
export type RoyaltyUploadSummaryDspResponse = z.infer<typeof royaltyUploadSummaryDspResponseSchema>;
export type RoyaltyUploadSummaryCountryResponse = z.infer<
  typeof royaltyUploadSummaryCountryResponseSchema
>;
export type RoyaltyUploadSummaryPayeeResponse = z.infer<
  typeof royaltyUploadSummaryPayeeResponseSchema
>;
