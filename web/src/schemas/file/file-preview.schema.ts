import z from 'zod';

export const filePreviewSchema = z.object({
  fileKey: z.string(),
  minimumHeaderCount: z.number().optional(),
});
export type FilePreviewSchema = z.infer<typeof filePreviewSchema>;
