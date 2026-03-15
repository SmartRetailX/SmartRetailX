import { z } from 'zod';

import { RoyaltyImportTemplateHeaders } from '@/constants/parse-data';

// Required template fields
const REQUIRED_TEMPLATE_FIELDS = RoyaltyImportTemplateHeaders.filter((field) => field.required).map(
  (field) => field.type,
);

const REQUIRED_TEMPLATE_FIELDS_NAME_STRING = REQUIRED_TEMPLATE_FIELDS.map((fieldType) => {
  const field = RoyaltyImportTemplateHeaders.find((f) => f.type === fieldType);
  return field ? field.name : fieldType;
}).join(', ');

// Base distro schema
const distroSchema = z.object({
  enabled: z.boolean(),
  name: z.string().min(1, 'Name is required'),
  templateName: z.string().optional(),
  color: z.string().optional(),
  image: z.string().optional(),
  columnMap: z.record(z.string()).refine(
    (template) => {
      // Check if all required fields are present and have non-empty values
      return REQUIRED_TEMPLATE_FIELDS.every(
        (field) => field in template && template[field] && template[field].trim() !== '',
      );
    },
    {
      message: `All required template fields (${REQUIRED_TEMPLATE_FIELDS_NAME_STRING}) must be mapped`,
    },
  ),
  description: z.string().optional(),
  currency: z.string().optional(),
  defaultCountry: z.string().optional(),
  defaultDsp: z.string().optional(),
});

// Update distro request schema
export const updateDistroSchema = distroSchema.partial().extend({
  template: z.string().optional(),
});

// Create distro schema
export const createDistroSchema = distroSchema;
export type CreateDistroSchema = z.infer<typeof createDistroSchema>;

// Export types inferred from schemas
export type UpdateDistroSchema = z.infer<typeof updateDistroSchema>;

// Template schemas
const templateBaseSchema = z.object({
  columnMap: z.record(z.string()).refine(
    (template) => {
      // Check if all required fields are present and have non-empty values
      return REQUIRED_TEMPLATE_FIELDS.every(
        (field) => field in template && template[field] && template[field].trim() !== '',
      );
    },
    {
      message: `All required template fields (${REQUIRED_TEMPLATE_FIELDS_NAME_STRING}) must be mapped`,
    },
  ),
  description: z.string().optional(),
  currency: z.string().optional(),
  defaultCountry: z.string().optional(),
  defaultDsp: z.string().optional(),
});

export const createTemplateSchema = templateBaseSchema;
export type CreateTemplateSchema = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = templateBaseSchema.partial();
export type UpdateTemplateSchema = z.infer<typeof updateTemplateSchema>;
