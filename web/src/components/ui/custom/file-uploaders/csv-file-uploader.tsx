import {
  IconCalendar,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import Papa from 'papaparse';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { ParsedDataTable } from '@/components/tables/custom-tables/parsed-data-table';
import { Button } from '@/components/ui/button';
import { FileUploadCard } from '@/components/ui/custom/file-uploaders';
import { MigrationFile } from '@/types/migration';

type CSVRecord = Record<string, string | number | boolean>;

/**
 * CSVFileUploader Component
 *
 * A modern file uploader specifically designed for CSV files with immediate parsing and preview.
 * Redesigned to match the current application design pattern with no upload/download buttons.
 *
 * @param title - Title for the upload card
 * @param description - Description text for the upload area
 * @param maxSizeMB - Maximum file size in MB (default: 50)
 * @param onDataParsed - Callback when CSV data is successfully parsed
 * @param onFileRemoved - Callback when file is removed
 * @param className - Additional CSS classes
 */
interface CSVFileUploaderProps {
  title?: string;
  description?: string;
  maxSizeMB?: number;
  onDataParsed?: (data: Papa.ParseResult<CSVRecord>) => void;
  onFileRemoved?: () => void;
  onValidationChange?: (
    isValid: boolean,
    file: File | null,
    data: Papa.ParseResult<CSVRecord> | null,
  ) => void;
  className?: string;
  // External state props - distinguish between selected and uploaded
  selectedFile?: File | null; // File that has been selected for upload
  uploadedFile?: File | null; // File that has been successfully uploaded
  isValid?: boolean; // Add validation status from parent
  // Optional custom delete function
  onFileDelete?: () => void;
  // Existing file from server
  existingFile?: MigrationFile;
  // Loading states
  isDeleting?: boolean; // Whether file deletion is in progress
}

export function CSVFileUploader({
  maxSizeMB = 50,
  onDataParsed,
  onFileRemoved,
  onValidationChange,
  className,
  selectedFile: externalSelectedFile,
  uploadedFile: externalUploadedFile,
  isValid,
  onFileDelete,
  existingFile,
  isDeleting = false,
}: CSVFileUploaderProps) {
  const [internalSelectedFile, setInternalSelectedFile] = useState<File | null>(null);

  // Use external files if provided, otherwise use internal state
  const selectedFile =
    externalSelectedFile !== undefined ? externalSelectedFile : internalSelectedFile;
  const uploadedFile = externalUploadedFile || null;

  // The current file to display (uploaded file takes precedence, then existing file, then selected)
  const currentFile = uploadedFile || selectedFile;

  // If there's an existing file from server, treat it as uploaded
  const hasExistingFile = !!existingFile;
  const isFileUploaded = !!uploadedFile || hasExistingFile;

  const handleFileSelect = useCallback(
    (file: File) => {
      // Only update internal state if no external file is provided
      if (externalSelectedFile === undefined) {
        setInternalSelectedFile(file);
      }
      onValidationChange?.(false, file, null);
    },
    [onValidationChange, externalSelectedFile],
  );

  const handleParseComplete = useCallback(
    (data: Papa.ParseResult<CSVRecord>) => {
      const fileToUse = currentFile;
      if (!fileToUse) return;

      onDataParsed?.(data);

      // Only check for basic parsing errors, don't mark as valid yet
      // The parent component will handle detailed validation
      const hasParsingErrors = data.errors?.length > 0 || data.data?.length === 0;
      if (hasParsingErrors) {
        onValidationChange?.(false, fileToUse, data);
      } else {
        // Don't mark as valid yet, just notify that parsing is complete
        onValidationChange?.(false, fileToUse, data);
      }
    },
    [onDataParsed, onValidationChange, currentFile],
  );

  const handleParseError = useCallback(
    (error: Error) => {
      const fileToUse = currentFile;
      if (!fileToUse) return;

      console.error('CSV Parse Error:', error);
      onValidationChange?.(false, fileToUse, null);
    },
    [onValidationChange, currentFile],
  );

  const handleFileRemove = useCallback(() => {
    // Use custom delete function if provided, otherwise use default behavior
    if (onFileDelete) {
      onFileDelete();
    } else {
      // Only update internal state if no external file is provided
      if (externalSelectedFile === undefined) {
        setInternalSelectedFile(null);
      }
      onFileRemoved?.();
      onValidationChange?.(false, null, null);
    }
  }, [onFileRemoved, onValidationChange, externalSelectedFile, onFileDelete]);

  const handleFileDownload = useCallback(() => {
    // For uploaded files, download from blob
    const fileToDownload = uploadedFile || selectedFile;
    if (fileToDownload) {
      const url = URL.createObjectURL(fileToDownload);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileToDownload.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // For existing files, we'd need to download from server
    // This would typically involve calling an API endpoint
    if (existingFile) {
      // TODO: Implement server download using existingFile.fileKey
      // For now, just show a message
      toast.info('Downloading existing file... (functionality to be implemented)');
      // You might want to call a download service here:
      // downloadService.downloadFile(existingFile.fileKey, existingFile.fileName);
    }
  }, [uploadedFile, selectedFile, existingFile]);

  return (
    <div className={className}>
      {!currentFile && !existingFile ? (
        <FileUploadCard
          allowedTypes={['text/csv', 'application/csv']}
          maxSizeMB={maxSizeMB}
          onFileSelect={handleFileSelect}
        />
      ) : (
        <div className='space-y-6'>
          {/* File Status */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl ${
              isFileUploaded
                ? isValid === true
                  ? 'bg-green-50/50 dark:bg-green-950/20'
                  : isValid === false
                    ? 'bg-red-50/50 dark:bg-red-950/20'
                    : 'bg-yellow-50/50 dark:bg-yellow-950/20'
                : 'bg-blue-50/50 dark:bg-blue-950/20' // Different color for selected but not uploaded
            }`}
          >
            <div className='flex items-center gap-3'>
              <div
                className={`p-2 rounded-lg ${
                  isFileUploaded
                    ? isValid === true
                      ? 'bg-green-100 dark:bg-green-900/50'
                      : isValid === false
                        ? 'bg-red-100 dark:bg-red-900/50'
                        : 'bg-yellow-100 dark:bg-yellow-900/50'
                    : 'bg-blue-100 dark:bg-blue-900/50' // Blue for selected state
                }`}
              >
                <IconCheck
                  className={`h-4 w-4 ${
                    isFileUploaded
                      ? isValid === true
                        ? 'text-green-600 dark:text-green-400'
                        : isValid === false
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400' // Blue for selected state
                  }`}
                />
              </div>
              <div>
                <h4
                  className={`text-sm font-medium ${
                    isFileUploaded
                      ? isValid === true
                        ? 'text-green-900 dark:text-green-100'
                        : isValid === false
                          ? 'text-red-900 dark:text-red-100'
                          : 'text-yellow-900 dark:text-yellow-100'
                      : 'text-blue-900 dark:text-blue-100' // Blue for selected state
                  }`}
                >
                  {isFileUploaded
                    ? hasExistingFile
                      ? 'File Uploaded & Completed'
                      : isValid === true
                        ? 'File Uploaded & Ready'
                        : isValid === false
                          ? 'Upload Failed - Validation Error'
                          : 'File Uploaded - Validating...'
                    : 'File Selected - Ready to Upload'}{' '}
                  {/* New state for selected */}
                </h4>
                <p
                  className={`text-sm truncate max-w-75 ${
                    isFileUploaded
                      ? isValid === true
                        ? 'text-green-700/80 dark:text-green-300/80'
                        : isValid === false
                          ? 'text-red-700/80 dark:text-red-300/80'
                          : 'text-yellow-700/80 dark:text-yellow-300/80'
                      : 'text-blue-700/80 dark:text-blue-300/80' // Blue for selected state
                  }`}
                >
                  {currentFile?.name || existingFile?.fileName || 'No file'}
                </p>
                {/* Show additional details for existing files */}
                {existingFile && (
                  <div className='flex items-center gap-3 mt-2 text-xs text-muted-foreground'>
                    <div className='flex items-center gap-1.5'>
                      <IconCalendar className='h-3 w-3' />
                      <span>{new Date(existingFile.createdAt).toLocaleDateString()}</span>
                    </div>
                    {existingFile.uploadedBy && (
                      <div className='flex items-center gap-1.5'>
                        <IconUser className='h-3 w-3' />
                        <span>
                          {existingFile.uploadedBy.firstName ||
                            existingFile.uploadedBy.email ||
                            'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {/* Download button - show for uploaded files or existing files */}
              {(uploadedFile || existingFile) && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleFileDownload}
                  className={`${
                    isFileUploaded
                      ? isValid === true
                        ? 'text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                        : isValid === false
                          ? 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50'
                          : 'text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                      : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  }`}
                  title={existingFile ? 'Download existing file' : 'Download uploaded file'}
                >
                  <IconDownload className='h-4 w-4' />
                </Button>
              )}

              {/* Remove/Delete button */}
              <Button
                variant='ghost'
                size='sm'
                onClick={handleFileRemove}
                disabled={isDeleting}
                className={`${
                  isFileUploaded
                    ? isValid === true
                      ? 'text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                      : isValid === false
                        ? 'text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50'
                        : 'text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
                    : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={
                  isDeleting
                    ? 'Deleting...'
                    : existingFile
                      ? 'Remove existing file'
                      : uploadedFile
                        ? 'Remove uploaded file'
                        : 'Remove selected file'
                }
              >
                {isDeleting ? (
                  <IconLoader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <IconTrash className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {/* CSV Table Viewer - only show for actual files, not existing file references */}
          {currentFile && (
            <ParsedDataTable
              file={currentFile}
              title='Data Preview'
              maxRows={10}
              maxColumns={8}
              showFileInfo={true}
              showPagination={true}
              onParseComplete={handleParseComplete}
              onParseError={handleParseError}
            />
          )}
        </div>
      )}
    </div>
  );
}
