import { z } from 'zod';

const templateSchema = z.object({
  _id: z.string(),
  distro: z.string(),
  version: z.number(),
  columnMap: z.record(z.string()), // API sends columnMap, not template
  description: z.string().optional(),
  currency: z.string().optional(),
  defaultCountry: z.string().optional(),
  defaultDsp: z.string().optional(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number(),
});

export const templateResponseSchema = templateSchema;

export type TemplateSchema = z.infer<typeof templateSchema>;

export const distroResponseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  enabled: z.boolean().optional(),
  color: z.string().optional(),
  image: z.string().optional(),
  template: templateSchema,
  description: z.string().optional(),
  lastImportedAt: z.string().optional(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  __v: z.number().optional(),
});
export type DistroResponseSchema = z.infer<typeof distroResponseSchema>;

export const distrosResponseSchema = z.array(distroResponseSchema);
export type DistrosResponseSchema = z.infer<typeof distrosResponseSchema>;

// Templates by distro ID
export const distroTemplatesResponseSchema = z.array(templateSchema);
export type DistroTemplatesResponseSchema = z.infer<typeof distroTemplatesResponseSchema>;
