import { useMutation } from '@tanstack/react-query';

import { FilePreviewSchema } from '@/schemas/file';
import { fileParseService } from '@/services/parse.service';

// Parse File
export const useParseFileMutation = () => {
  return useMutation({
    mutationFn: (data: FilePreviewSchema) => fileParseService.parseFile(data),
  });
};
