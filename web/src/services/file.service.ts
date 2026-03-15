import axios from 'axios';

import { useAxios } from '@/hooks/use-axios';
import { handleApiError } from '@/utils/error-handler';

interface PresignedUploadResponse {
  key: string;
  uploadUrl: string;
  viewUrl: string;
}

interface TempFileUploadResponse {
  key: string;
  uploadUrl: string;
  previewUrl: string;
  name: string;
  mimeType: string;
  size: number;
}

class FileService {
  private readonly fileApiClient;

  constructor() {
    this.fileApiClient = useAxios;
  }

  /**
   * Get presigned URL for file upload
   */
  async getPresignedUploadUrl(
    filename: string,
    contentType: string,
    isPublic: boolean = false,
  ): Promise<PresignedUploadResponse> {
    try {
      const response = await this.fileApiClient.post('file/presigned-url', {
        filename,
        contentType,
        isPublic,
      });

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Upload file directly to S3 using presigned URL
   */
  async uploadToS3(
    uploadUrl: string,
    file: File,
    onProgress?: (progressEvent: { loaded: number; total: number }) => void,
  ): Promise<void> {
    try {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
            });
          }
        },
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Complete image upload flow: get presigned URL, upload to S3, return final URL
   */
  async uploadImage(
    file: File,
    onProgress?: (progressEvent: { loaded: number; total: number }) => void,
  ): Promise<TempFileUploadResponse> {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('Image must be less than 5MB');
      }

      // Get presigned URL
      const presignedData = await this.getPresignedUploadUrl(file.name, file.type, true);

      // Upload to S3
      await this.uploadToS3(presignedData.uploadUrl, file, onProgress);

      return {
        key: presignedData.key,
        uploadUrl: presignedData.uploadUrl,
        previewUrl: presignedData.viewUrl,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      };
    } catch (error) {
      console.error('Error in complete image upload flow:', error);
      throw error;
    }
  }

  /**
   * Complete file upload flow: get presigned URL, upload to S3, return final URL
   */
  async uploadFileToTemp(
    file: File,
    onProgress?: (progressEvent: { loaded: number; total: number }) => void,
  ): Promise<TempFileUploadResponse> {
    try {
      // Validate file type
      if (!file.type) {
        throw new Error('File must have a valid MIME type');
      }

      // Validate file size (max 200MB)
      const maxSize = 200 * 1024 * 1024; // 200MB
      if (file.size > maxSize) {
        throw new Error('File must be less than 200MB');
      }

      // Get presigned URL
      const presignedData = await this.getPresignedUploadUrl(file.name, file.type, true);

      // Upload to S3
      await this.uploadToS3(presignedData.uploadUrl, file, onProgress);

      return {
        key: presignedData.key,
        uploadUrl: presignedData.uploadUrl,
        previewUrl: presignedData.viewUrl,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      };
    } catch (error) {
      console.error('Error in complete image upload flow:', error);
      throw error;
    }
  }

  /**
   * Generate a temporary download link for a file
   */
  async generateTempDownloadLink(fileKey: string): Promise<string> {
    try {
      const response = await this.fileApiClient.get(`file/presigned-url`, {
        params: {
          fileKey,
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export default new FileService();
