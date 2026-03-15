import { ParseSheetResponseSchema } from '@/schemas/response-validation/parse.schema';
import { ParsedSheet } from '@/types/parse';

export const mapParsedData = (
  apiDistro: ParseSheetResponseSchema,
): {
  data: ParsedSheet[];
  success: boolean;
} => {
  return {
    data: apiDistro.data.map((sheet) => ({
      sheetName: sheet.sheetName,
      headers: sheet.headers,
      rows: sheet.rows,
    })),
    success: apiDistro.success,
  };
};
