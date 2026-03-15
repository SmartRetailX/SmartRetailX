import { z } from 'zod';

/**
 * Season API Response Schema
 * Validates the raw API response from the backend
 */
export const seasonResponseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  dateRange: z.object({
    from: z.string(), // ISO string from API
    to: z.string().optional(), // ISO string from API
  }),
  closed: z.boolean().optional(),
  createdBy: z.string(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
  __v: z.number().optional(),
});

export type SeasonResponseSchema = z.infer<typeof seasonResponseSchema>;

/**
 * Seasons List API Response Schema
 */
export const seasonsResponseSchema = z.array(seasonResponseSchema);
export type SeasonsResponseSchema = z.infer<typeof seasonsResponseSchema>;
