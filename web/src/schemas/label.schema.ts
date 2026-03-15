import * as z from 'zod';

export type LabelFormValues = z.infer<typeof labelFormSchema>;
export const labelFormSchema = z.object({
  name: z.string().min(1, 'Label name is required'),
});
