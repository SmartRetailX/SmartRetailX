import z from 'zod';

export const migrationFileSchema = z.object({
  fileKey: z.string().nonempty().describe('File key from temporary upload'),
  fileType: z.string().nonempty().describe('Type of migration file (source-specific)'),
});

export const createMigrationSchema = z.object({
  source: z.string().nonempty().describe('Migration source system'),
  files: z.array(migrationFileSchema).describe('Files to include in this migration'),
});
export type CreateMigrationSchema = z.infer<typeof createMigrationSchema>;

export const startMigrationSchema = z.object({
  migrationId: z.string().nonempty().describe('Migration ID to start processing'),
});
