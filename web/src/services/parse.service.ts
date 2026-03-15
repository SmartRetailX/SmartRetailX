import { mapParsedData } from '@/mappers/parse.mapper';
import { FilePreviewSchema } from '@/schemas/file';
import { parseSheetResponseSchema } from '@/schemas/response-validation/parse.schema';
import { ParsedSheet } from '@/types/parse';

import { apiClient } from './api-client';

const BASE_URL = '/worker/file-preview';

export const fileParseService = {
  // Parse file
  parseFile: async (
    data: FilePreviewSchema,
  ): Promise<{
    data: ParsedSheet[];
    success: boolean;
  }> => {
    try {
      const res = await apiClient.post(`${BASE_URL}`, data);
      const parse = await parseSheetResponseSchema.parseAsync(res);

      const mappedData = mapParsedData(parse);

      return mappedData;
    } catch (error) {
      console.error('Error creating distro:', error);
      throw error;
    }
  },
};
