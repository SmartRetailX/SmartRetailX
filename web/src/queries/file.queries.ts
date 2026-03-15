import { useMutation } from '@tanstack/react-query';

import fileService from '@/services/file.service';

/**
 * Mutation hook for uploading files to temporary storage
 */
export const useUploadFileToTemp = () => {
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progressEvent: { loaded: number; total: number }) => void;
    }) => {
      return await fileService.uploadFileToTemp(file, onProgress);
    },
  });
};

/**
 * Mutation hook for uploading images
 */
export const useUploadImage = () => {
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (progressEvent: { loaded: number; total: number }) => void;
    }) => {
      return await fileService.uploadImage(file, onProgress);
    },
  });
};

/**
 * Generate a presigned URL for file download
 */
export const useGeneratePresignedDownloadUrl = () => {
  return useMutation({
    mutationFn: async (fileKey: string) => {
      return await fileService.generateTempDownloadLink(fileKey);
    },
  });
};
