import { z } from 'zod';

import { MIGRATION_PLATFORMS } from '@/constants/migrations';

export const migrationPlatformSchema = z.enum([MIGRATION_PLATFORMS.LABEL_ENGINE]);

export const migrationSearchSchema = z.object({
  platform: migrationPlatformSchema,
  id: z
    .string()
    .optional()
    .transform((v) => v?.trim())
    .refine((v) => !v || v.length > 0, {
      message: 'id cannot be empty',
    }),
  step: z.number().optional().default(1),
});
