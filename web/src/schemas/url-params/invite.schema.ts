import z from 'zod';

export const homeSearchSchema = z.object({
  invite: z.string().optional(),
});
export type HomeSearchParams = z.infer<typeof homeSearchSchema>;
