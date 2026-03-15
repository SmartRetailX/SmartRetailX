import * as z from 'zod';

import { PAYEE_ROLE } from '@/constants';

const base62 = /^[A-Za-z0-9]+$/;

const spotifyTrackUrl = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value) return true; // allow empty/undefined
      try {
        const u = new URL(value);
        if (u.protocol !== 'https:' || u.hostname !== 'open.spotify.com') return false;

        const segments = u.pathname.replace(/^\/+|\/+$/g, '').split('/');

        // Get the track ID from either:
        // - /track/:id
        // - /intl-xx/track/:id
        const getId = () => {
          if (segments[0] === 'track' && segments[1]) return segments[1];
          if (segments[0]?.startsWith('intl-') && segments[1] === 'track' && segments[2])
            return segments[2];
          return null;
        };

        const id = getId();
        // Enforce 22-char base62 Spotify ID
        return !!id && id.length === 22 && base62.test(id);
      } catch {
        return false;
      }
    },
    {
      message: 'Must be a valid Spotify track URL like https://open.spotify.com/track/{id}',
    },
  );

const contractSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  isrc: z.string().min(12, 'ISRC must be 12 characters').max(12, 'ISRC must be 12 characters'),
  upc: z.string().min(1, 'UPC is required'),
  catalogNo: z.string().min(1, 'Catalogue number is required'),
  // Image is now a URL string
  image: z.string().url('Must be a valid URL').optional(),
  payees: z
    .array(
      z.object({
        id: z.string().min(1, 'Payee ID is required'),
        name: z.string().min(1, 'Payee name is required'),
        email: z.string().email('Valid email is required'),
        image: z.string().optional(),
        type: z.nativeEnum(PAYEE_ROLE, {
          errorMap: () => ({ message: 'Payee type is required' }),
        }),
        split: z
          .number()
          .min(0, 'Split must be a positive number')
          .max(100, 'Split must be less than or equal to 100'),
      }),
    )
    .min(1, 'At least one payee is required'),
  title: z.string().min(1, 'Title is required'),
  releaseTitle: z.string().min(1, 'Release title is required'),
  // Date
  releaseDate: z.string().min(1, 'Release date is required'),
  version: z.string().optional(),
  spotifyUrl: spotifyTrackUrl,
});

export const createContractSchema = contractSchema;
export type CreateContractInput = z.infer<typeof createContractSchema>;

export const updateContractSchema = contractSchema
  .partial()
  .extend({
    payees: z
      .array(
        z.object({
          id: z.string().min(1, 'Payee ID is required'),
          type: z.nativeEnum(PAYEE_ROLE, {
            errorMap: () => ({ message: 'Payee type is required' }),
          }),
          split: z
            .number()
            .min(0, 'Split must be a positive number')
            .max(100, 'Split must be less than or equal to 100'),
        }),
      )
      .optional(),
    recalculate: z.boolean().default(false),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.recalculate) {
      if (!data.fromDate) {
        ctx.addIssue({
          path: ['fromDate'],
          message: 'From date is required when recalculate is true',
          code: z.ZodIssueCode.custom,
        });
      }
      if (!data.toDate) {
        ctx.addIssue({
          path: ['toDate'],
          message: 'To date is required when recalculate is true',
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

export type UpdateContractInput = z.infer<typeof updateContractSchema>;
