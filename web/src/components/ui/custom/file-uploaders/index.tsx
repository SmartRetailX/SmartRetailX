// OLD

import { IconAlertCircle, IconCheck, IconFileText, IconUpload, IconX } from '@tabler/icons-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  fileTypeGetters,
  generateAcceptAttribute,
  getFormattedFileTypes,
  isFileLikelyCorrupted,
  validateFileComprehensive,
} from '@/utils/file-utils/file-type-utils';
import { formatFileSize } from '@/utils/file-utils/format-file-size';

// Types for better TypeScript support
interface FileWithPreview extends File {
  preview?: string;
}

interface FileError {
  message: string;
  type: 'size' | 'type' | 'upload' | 'network';
}

export function FileUploadCard({
  allowedTypes = ['text/csv'],
  maxSizeMB = 10,
  onFileSelect,
  selectOnly = false,
}: {
  allowedTypes?: string[];
  maxSizeMB?: number;
  onFileSelect?: (file: File) => void;
  selectOnly?: boolean;
}) {
  const [file, setFile] = useState<FileWithPreview | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<FileError | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = useCallback(
    (file: File): FileError | null => {
      const validation = validateFileComprehensive(file, {
        allowedTypes,
        maxSizeMB,
      });

      if (!validation.isValid) {
        return {
          message: validation.errors[0], // Show first error
          type: validation.errors[0].includes('size') ? 'size' : 'type',
        };
      }

      // Check for potentially corrupted files
      if (isFileLikelyCorrupted(file)) {
        return {
          message: 'File appears to be corrupted or incomplete',
          type: 'type',
        };
      }

      return null;
    },
    [allowedTypes, maxSizeMB],
  );

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const error = validateFile(selectedFile);
      if (error) {
        setFileError(error);
        return;
      }

      setFileError(null);
      setUploadSuccess(false);
      setFile(selectedFile);

      // Call the callback if provided
      onFileSelect?.(selectedFile);

      // If selectOnly mode, clear the file immediately after callback
      if (selectOnly) {
        setTimeout(() => {
          setFile(null);
        }, 100);
      }
    },
    [validateFile, onFileSelect, selectOnly],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect],
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setFileError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const simulateUpload = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        setUploadProgress(Math.min(progress, 100));

        if (progress >= 100) {
          clearInterval(interval);
          // Simulate random success/failure for demo
          if (Math.random() > 0.2) {
            resolve();
          } else {
            reject(new Error('Upload failed due to network error'));
          }
        }
      }, 200);
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) return;

      setIsUploading(true);
      setFileError(null);
      setUploadProgress(0);

      try {
        // Simulate file upload
        await simulateUpload();

        setUploadSuccess(true);

        // Auto-reset after success
        setTimeout(() => {
          removeFile();
          setUploadSuccess(false);
        }, 3000);
      } catch (error) {
        setFileError({
          message: error instanceof Error ? error.message : 'Upload failed',
          type: 'upload',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [file, simulateUpload, removeFile],
  );

  return (
    <>
      <form onSubmit={handleSubmit} className='grid gap-4'>
        <div className='flex items-center justify-center w-full'>
          <label
            htmlFor='dropzone-file'
            className={cn(
              'flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 p-10',
              isDragOver
                ? 'border-blue-400 card dark:bg-blue-950/20'
                : 'border-gray-300 bg-card hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600',
              fileError && 'border-red-400 bg-red-50 dark:bg-red-950/20',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className='flex flex-col items-center justify-center pt-5 pb-6'>
              {uploadSuccess ? (
                <>
                  <IconCheck className='w-10 h-10 text-green-500 mb-3' />
                  <p className='text-sm text-green-600 dark:text-green-400 font-medium'>
                    File uploaded successfully!
                  </p>
                </>
              ) : fileError ? (
                <>
                  <IconAlertCircle className='w-10 h-10 text-red-500 mb-3' />
                  <p className='text-sm text-red-600 dark:text-red-400 font-medium'>
                    {fileError.message}
                  </p>
                </>
              ) : (
                <>
                  <IconUpload
                    className={cn(
                      'w-10 h-10 mb-3 transition-colors',
                      isDragOver ? 'text-blue-500' : 'text-gray-400',
                    )}
                  />
                  <p className='mb-2 text-sm text-gray-500 dark:text-gray-400'>
                    <span className='font-semibold'>Click to upload</span> or drag and drop
                  </p>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {getFormattedFileTypes(allowedTypes)} files (max {maxSizeMB}MB)
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              id='dropzone-file'
              type='file'
              className='hidden'
              accept={generateAcceptAttribute(allowedTypes)}
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        </div>

        {file && !uploadSuccess && !selectOnly && (
          <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border'>
            <div className='flex items-start justify-between mb-3'>
              <div className='flex items-center gap-3'>
                <IconFileText className='w-5 h-5 text-gray-500 shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='font-medium text-sm truncate'>{file.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    {formatFileSize(file.size)} • {fileTypeGetters(file)}
                  </p>
                </div>
              </div>
              {!isUploading && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={removeFile}
                  className='h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700'
                >
                  <IconX className='w-4 h-4' />
                </Button>
              )}
            </div>

            {isUploading && (
              <div className='mb-3'>
                <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700'>
                  <div
                    className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={removeFile}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type='submit' size='sm' disabled={isUploading || !!fileError}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </>
  );
}

// Export the new AttachmentUploader component
export { AttachmentUploader } from './attachment-uploader';
