import { z } from 'zod';

import { MIGRATION_PLATFORMS } from '@/constants/migrations';

const migrationFileTypeSchema = z.object({
  type: z.string(),
  description: z.string(),
  label: z.string(),
  order: z.number(),
  required: z.boolean(),
  mimeType: z.string(),
  headers: z.array(z.string()),
});
export type MigrationFileType = z.infer<typeof migrationFileTypeSchema>;

export const migrationMetadataResponseSchema = z.object({
  source: z.nativeEnum(MIGRATION_PLATFORMS),
  supportedFileTypes: z.array(migrationFileTypeSchema),
});
export type MigrationMetadataResponse = z.infer<typeof migrationMetadataResponseSchema>;
