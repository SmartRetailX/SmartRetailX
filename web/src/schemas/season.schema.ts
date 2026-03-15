import * as z from 'zod';

const dateRangeSchema = z
  .object({
    from: z.date(),
    to: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.to === undefined) {
        return true;
      }
      if (data.to && data.from >= data.to) {
        return false;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['to'],
    },
  );

export const seasonSchema = z.object({
  name: z.string().min(1, 'Season name is required'),
  dateRange: dateRangeSchema,
});

export const createSeasonSchema = seasonSchema;
export const updateSeasonSchema = seasonSchema.partial();

export type CreateSeasonInput = z.infer<typeof createSeasonSchema>;
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>;
