import { z } from 'zod';

import { ROYALTY_IMPORT_STATUS } from '@/constants';

import { distroResponseSchema } from './distro.schema';

// File object schema for royalty imports
const royaltyImportFileSchema = z.object({
  originalName: z.string().optional().nullable(),
  size: z.number().optional().nullable(),
  key: z.string().optional().nullable(),
  uploadedBy: z.string().optional().nullable(),
});

// Month period schema for royalty imports
const royaltyImportMonthSchema = z.object({
  month: z.number(),
  year: z.number(),
});

// Updated uploadedBy schema for royalty imports
const royaltyImportUploadedBySchema = z.object({
  _id: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  __v: z.number().optional().nullable(),
});

// Updated royaltyImportSchema
const royaltyImportSchema = z.object({
  _id: z.string(),
  // file object contains fileName (originalName) and fileSize (size)
  file: royaltyImportFileSchema.optional().nullable(),
  // months array contains period data
  months: z.array(royaltyImportMonthSchema).optional().nullable(),
  // keep month/year as optional for backward compatibility
  fileName: z.string().optional().nullable(),
  month: z.number().optional().nullable(),
  year: z.number().optional().nullable(),
  distro: distroResponseSchema
    .extend({
      template: z.union([z.string(), distroResponseSchema.shape.template]).optional().nullable(),
      type: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  template: z.record(z.string()).optional().nullable(),
  fileSize: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  parsedRoyalties: z.number().optional(),
  labelShare: z.number().optional(),
  uploadedBy: royaltyImportUploadedBySchema.optional().nullable(),
  reference: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export const royaltyImportResponse = royaltyImportSchema;
export type RoyaltyImportResponse = z.infer<typeof royaltyImportResponse>;

export const royaltyImportsResponse = z.object({
  data: z.array(royaltyImportSchema),
  total: z.number(),
});
export type RoyaltyImportsResponse = z.infer<typeof royaltyImportsResponse>;

// Contract Royalty Response Schema (royalty data by contract ID)
export const contractRoyaltyResponseSchema = z.object({
  _id: z.string(),
  isrc: z.string().optional(),
  month: z.number(),
  year: z.number(),
  totalEarnings: z.number(),
  totalStreams: z.number(),
  date: z.string().optional(),
  distroName: z.string().optional(),
  distro: z
    .object({
      _id: z.string(),
      name: z.string(),
    })
    .optional(),
  royaltyUpload: z
    .object({
      _id: z.string(),
      reference: z.string(),
      createdAt: z.string().optional(),
    })
    .optional(),
});
export type ContractRoyaltyResponse = z.infer<typeof contractRoyaltyResponseSchema>;

export const contractRoyaltiesResponse = z.object({
  data: z.array(contractRoyaltyResponseSchema),
  total: z.number(),
});
export type ContractRoyaltiesResponse = z.infer<typeof contractRoyaltiesResponse>;

// File object schema for the new API response structure
const fileObjectSchema = z.object({
  _id: z.string(),
  originalName: z.string(),
  size: z.number(),
  key: z.string(),
  tags: z.array(z.string()).optional().nullable(),
  uploadedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number(),
});

// Month period schema
const monthPeriodSchema = z.object({
  month: z.number(),
  year: z.number(),
});

// Simplified uploadedBy schema for all uploads
const uploadedBySimpleSchema = z.object({
  _id: z.string(),
  email: z.string(),
  userId: z.string(),
});

// All Royalty Uploads Response Schema
const baseRoyaltyUploadSchema = z.object({
  _id: z.string(),
  file: fileObjectSchema,
  status: z.nativeEnum(ROYALTY_IMPORT_STATUS),
  months: z.array(monthPeriodSchema),
  distro: distroResponseSchema.extend({
    template: z.string(),
  }),
  isPaid: z.boolean(),
  currency: z.string(),
  exchangeRate: z.number(),
  processLater: z.boolean(),
  skippedRows: z.array(z.number()).nullable(),
  parsedRoyalties: z.number().optional(),
  labelShare: z.number().optional(),
  failureReason: z.string().optional(),
  uploadedBy: uploadedBySimpleSchema,
  reference: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BaseRoyaltyUploadResponse = z.infer<typeof baseRoyaltyUploadSchema>;

export const allRoyaltyUploadsResponse = z.object({
  data: z.array(baseRoyaltyUploadSchema),
  total: z.number(),
});
export type AllRoyaltyUploadsResponse = z.infer<typeof allRoyaltyUploadsResponse>;
