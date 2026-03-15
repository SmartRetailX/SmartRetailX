import { z } from 'zod';

// Header map {string: string}
const headersSchema = z.record(z.string());
const rowsSchema = z.record(z.string());

const sheetSchema = z.object({
  sheetName: z.string(),
  headers: headersSchema,
  rows: z.array(rowsSchema),
});

export const parseSheetResponseSchema = z.object({
  data: z.array(sheetSchema),
  success: z.boolean(),
});
export type ParseSheetResponseSchema = z.infer<typeof parseSheetResponseSchema>;
