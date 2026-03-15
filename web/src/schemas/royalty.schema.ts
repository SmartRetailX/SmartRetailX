import { z } from 'zod';

// Month object schema
const monthSchema = z.object({
  year: z.number().min(1900),
  month: z.number().min(1).max(12),
});

// Range schema - from is required, to is optional
const rangeSchema = z.object({
  from: monthSchema,
  to: monthSchema.optional(),
});

const baseRoyaltyImportSchema = z.object({
  // Common fields
  distroId: z.string().min(1, 'Distribution is required'),
  fileKey: z.string().min(1, 'File is required'),
  isPaid: z.boolean(),
  processLater: z.boolean(),
  reference: z.string().min(1, 'Reference is required'),
});

// Import royalty schema matching backend DTO (template-based)
export const importRoyaltySchema = baseRoyaltyImportSchema.extend({
  period: rangeSchema,
  exchangeRate: z.number().optional(),
  sheetsToParse: z.array(z.number()).optional(), // Indices of sheets to parse (0-based)
  templateId: z.string().optional(), // Template ID to be used in parsing
});

export type ImportRoyaltySchema = z.infer<typeof importRoyaltySchema>;

// ─── Manual Import ────────────────────────────────────────────────────────────

// A single contract + amount entry for manual royalty import
export const manualRoyaltyItemSchema = z.object({
  contractId: z.string().min(1, 'Contract is required'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  streamCount: z.number().optional(),
  period: rangeSchema,
  countryCode: z.string().length(2, 'Country code must be 2 characters').optional(),
  dsp: z.string().optional(),
});

export type ManualRoyaltyItemSchema = z.infer<typeof manualRoyaltyItemSchema>;

// Manual royalty import schema matching POST /organization/royalty-upload/manual
export const manualImportRoyaltySchema = baseRoyaltyImportSchema.extend({
  royalties: z
    .array(manualRoyaltyItemSchema)
    .min(1, 'At least one contract royalty entry is required'),
});

export type ManualImportRoyaltySchema = z.infer<typeof manualImportRoyaltySchema>;
