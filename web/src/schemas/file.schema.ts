import { z } from 'zod';

export const presignUploadRequestSchema = z.object({
  filename: z.string().min(1, 'filename required'),
  contentType: z
    .string()
    .min(1, 'contentType required')
    // basic safety: only allow images here; expand as needed
    .regex(/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i, 'unsupported content type'),
  // Optional size limit hint from client (server must still enforce)
  size: z.number().int().positive().optional(),
  // Optional: where to attach later
  // e.g., { entity: 'contract', id: '...' }
  attachTo: z
    .object({
      entity: z.enum(['contract', 'user', 'asset']).optional(),
      id: z.string().optional(),
    })
    .optional(),
});

export type PresignUploadRequest = z.infer<typeof presignUploadRequestSchema>;
