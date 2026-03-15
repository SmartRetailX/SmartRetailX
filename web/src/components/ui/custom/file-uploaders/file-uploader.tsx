import { FileText, FileUp, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Accept, FileRejection, useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; // ensure this is the right import in your setup
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import FileService from '@/services/file.service';

export type UploadedFile = {
  url: string;
  key: string;
  name: string;
  mimeType: string;
  size: number;
};

export type FileMeta = {
  fileName: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
};

interface AutoUploadFileDropzoneProps {
  value?: UploadedFile | UploadedFile[];
  disabled?: boolean;
  width?: string;
  height?: string;
  className?: string;
  placeholder?: string;
  multiple?: boolean;
  maxSizeBytes?: number; // default 10MB
  accept?: Accept;
  onChange: (files: UploadedFile[] | UploadedFile | undefined) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  onBeforeUpload?: (file: File) => Promise<boolean>; // Return true to proceed, false to cancel
}

type UploadingItem = {
  id: string;
  file: File;
  progress: number; // 0-100
  error?: string;
  abortController?: AbortController;
};

function isImage(mimeOrType: string) {
  return mimeOrType?.startsWith('image/');
}

function createId() {
  return Math.random().toString(36).slice(2);
}

// Custom upload function with abort support and proper progress tracking
async function uploadFileWithAbort(
  file: File,
  signal: AbortSignal,
  onProgress: (progress: { loaded: number; total: number }) => void,
): Promise<{ previewUrl: string; key: string; name: string; mimeType: string; size: number }> {
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
  const presignedData = await FileService.getPresignedUploadUrl(file.name, file.type, true);

  // Check if cancelled after getting presigned URL
  if (signal.aborted) {
    throw new Error('Upload cancelled');
  }

  // Use XMLHttpRequest for proper upload progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Handle abort signal
    const onAbort = () => {
      xhr.abort();
      reject(new Error('Upload cancelled'));
    };
    signal.addEventListener('abort', onAbort);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress({ loaded: event.loaded, total: event.total });
      }
    };

    // Handle completion
    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          key: presignedData.key,
          previewUrl: presignedData.viewUrl,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    // Handle errors
    xhr.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error('Upload failed'));
    };

    // Handle abort
    xhr.onabort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error('Upload cancelled'));
    };

    // Start upload
    xhr.open('PUT', presignedData.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

export function AutoUploadFileDropzone({
  value,
  disabled,
  width = '100%',
  height = '240px',
  className,
  placeholder = 'Upload files',
  multiple = false,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  accept = {
    // Images
    'image/png': [],
    'image/jpg': [],
    'image/jpeg': [],
    'image/webp': [],
    'image/gif': [],
    'image/svg+xml': [],
    // Documents
    'application/pdf': [],
    'application/msword': [],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
    'application/vnd.ms-excel': [],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
    'application/vnd.ms-powerpoint': [],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': [],
    'text/plain': [],
    'text/csv': [],
    'application/zip': [],
  },
  onChange,
  onUploadingChange,
  onBeforeUpload,
}: AutoUploadFileDropzoneProps) {
  const [uploaded, setUploaded] = useState<UploadedFile[]>(
    Array.isArray(value) ? value : value ? [value] : [],
  );
  const [uploading, setUploading] = useState<UploadingItem[]>([]);

  const isUploading = uploading.some((u) => u.progress > 0 && u.progress < 100);

  // Keep external value in sync
  useEffect(() => {
    if (Array.isArray(value)) setUploaded(value);
    else if (value) setUploaded([value]);
    else setUploaded([]);
  }, [value]);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const emit = useCallback(
    (next: UploadedFile[]) => {
      // Use queueMicrotask to ensure onChange is called after the current render cycle
      queueMicrotask(() => {
        if (multiple) onChange(next);
        else onChange(next[0] ?? undefined);
      });
    },
    [multiple, onChange],
  );

  const startUpload = useCallback(
    async (file: File) => {
      // Check if validation callback exists and run it
      if (onBeforeUpload) {
        try {
          const shouldProceed = await onBeforeUpload(file);
          if (!shouldProceed) {
            return; // Cancel upload if validation fails
          }
        } catch (error) {
          console.error('Validation error:', error);
          return;
        }
      }

      const id = createId();
      const abortController = new AbortController();

      setUploading((prev) => [...prev, { id, file, progress: 0, abortController }]);

      try {
        // Custom upload implementation with abort support
        const result = await uploadFileWithAbort(file, abortController.signal, (progress) => {
          const pct =
            progress.total && progress.total > 0
              ? Math.round((progress.loaded / progress.total) * 100)
              : 0;
          setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, progress: pct } : u)));
        });

        // Check if upload was cancelled
        if (abortController.signal.aborted) {
          return;
        }

        const uploadedItem: UploadedFile = {
          url: result.previewUrl,
          key: result.key,
          name: result.name,
          mimeType: result.mimeType,
          size: result.size,
        };

        // Remove from uploading list immediately and add to uploaded list
        setUploading((prev) => prev.filter((u) => u.id !== id));

        // Update uploaded files state using the functional update to get the latest state
        setUploaded((prev) => {
          const nextUploaded = multiple ? [...prev, uploadedItem] : [uploadedItem];
          // Emit change after state is updated
          emit(nextUploaded);
          return nextUploaded;
        });

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        // Don't show error if upload was cancelled
        if (abortController.signal.aborted) {
          // Remove immediately if cancelled
          setUploading((prev) => prev.filter((u) => u.id !== id));
          return;
        }

        console.error('Upload failed:', error);
        const message = error instanceof Error ? error.message : 'Upload failed';
        toast.error(`${file.name}: ${message}`);
        setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, error: message } : u)));

        // Remove failed upload after showing error for a moment
        setTimeout(() => {
          setUploading((prev) => prev.filter((u) => u.id !== id));
        }, 2000);
      }
    },
    [emit, multiple, onBeforeUpload],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const r = rejectedFiles[0];
        if (r.errors.some((e) => e.code === 'file-too-large')) {
          toast.error(`File must be less than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`);
        } else if (r.errors.some((e) => e.code === 'file-invalid-type')) {
          toast.error('Unsupported file type');
        } else {
          toast.error('Invalid file');
        }
        return;
      }

      if (!acceptedFiles.length) return;

      const filesToUpload = multiple ? acceptedFiles : [acceptedFiles[0]];
      filesToUpload.forEach((f) => startUpload(f));
    },
    [maxSizeBytes, multiple, startUpload],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const nextUploaded = uploaded.filter((_, i) => i !== index);
      setUploaded(nextUploaded);
      emit(nextUploaded);
    },
    [emit, uploaded],
  );

  const handleCancelUpload = useCallback((id: string) => {
    setUploading((prev) => {
      const uploadItem = prev.find((u) => u.id === id);
      if (uploadItem?.abortController) {
        uploadItem.abortController.abort();
        toast.info(`${uploadItem.file.name} upload cancelled`);
      }
      return prev.filter((u) => u.id !== id);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: multiple ? 50 : 1,
    maxSize: maxSizeBytes,
    accept,
    disabled: disabled,
    multiple,
  });

  const gridCols = useMemo(() => {
    const len = uploaded.length + uploading.length;
    if (len === 0) return 'grid-cols-1';
    if (len === 1) return 'grid-cols-1';
    if (len === 2) return 'grid-cols-2';
    if (len === 3) return 'grid-cols-3';
    // For 4+ files, use responsive layout with max 3 columns on larger screens
    return 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3';
  }, [uploaded.length, uploading.length]);

  // Hide upload area when multiple is false and there are uploaded files or files being uploaded
  const shouldHideUploadArea = !multiple && (uploaded.length > 0 || uploading.length > 0);

  return (
    <div className={cn('relative', className)} style={{ width }}>
      {!shouldHideUploadArea && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-md transition-colors',
            'bg-muted/30 hover:bg-muted/50',
            'cursor-pointer',
            isDragActive && 'border-primary bg-primary/10',
            disabled && 'opacity-60 cursor-not-allowed hover:bg-muted/30',
          )}
          style={{ height }}
        >
          <input {...getInputProps()} />
          <div className='h-full w-full flex flex-col items-center justify-center gap-2 px-4 text-center'>
            {isUploading ? (
              <div className='flex flex-col items-center gap-3 w-full max-w-72'>
                <Loader2 className='h-8 w-8 text-primary animate-spin' />
                <Progress
                  value={
                    uploading.length
                      ? Math.round(uploading.reduce((a, b) => a + b.progress, 0) / uploading.length)
                      : 0
                  }
                  className='h-2 w-full'
                />
                <p className='text-sm font-medium'>
                  Uploading...{' '}
                  {uploading.length
                    ? Math.round(uploading.reduce((a, b) => a + b.progress, 0) / uploading.length)
                    : 0}
                  %
                </p>
              </div>
            ) : (
              <>
                <FileUp className='h-10 w-10 text-muted-foreground' />
                <div>
                  <p className='text-sm font-medium'>
                    {isDragActive ? 'Drop files here...' : placeholder}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Drag and drop or click to upload (max {Math.round(maxSizeBytes / (1024 * 1024))}
                    MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(uploaded.length > 0 || uploading.length > 0) && (
        <div className={cn('mt-3 grid gap-3', gridCols)}>
          {uploaded.map((f, idx) => (
            <FileCard
              key={`${f.url}-${idx}`}
              variant='uploaded'
              item={f}
              onRemove={() => handleRemove(idx)}
              disabled={disabled}
            />
          ))}

          {uploading.map((u) => (
            <FileCard
              key={u.id}
              variant='uploading'
              item={u}
              onCancel={() => handleCancelUpload(u.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Shared single card for both states */
type FileCardProps =
  | {
      variant: 'uploading';
      item: UploadingItem;
      onCancel?: () => void;
      className?: string;
    }
  | {
      variant: 'uploaded';
      item: UploadedFile;
      onRemove?: () => void;
      disabled?: boolean;
      className?: string;
    };

export function FileCard(props: FileCardProps) {
  if (props.variant === 'uploading') {
    const { item, onCancel, className } = props;
    const image = isImage(item.file.type);

    return (
      <Card className={cn('p-3', className)}>
        <div className='flex items-center justify-between gap-3'>
          {/* Left: preview/icon and file info */}
          <div className='flex items-center gap-3 min-w-0 flex-1'>
            {/* Preview/icon */}
            <div className='flex items-center justify-center bg-muted/40 rounded-md overflow-hidden w-16 h-16 shrink-0'>
              {image ? (
                <ImageIcon className='h-7 w-7 text-muted-foreground opacity-70' />
              ) : (
                <FileText className='h-7 w-7 text-muted-foreground' />
              )}
            </div>

            {/* File info */}
            <div className='min-w-0 flex-1'>
              <div className='text-sm font-medium truncate' title={item.file.name}>
                {item.file.name}
              </div>
              <div className='mt-2'>
                <Progress value={item.progress} className='h-2' />
              </div>
              <div className='mt-1 text-xs text-muted-foreground'>
                {item.progress}%{item.error ? ` • ${item.error}` : ''}
                {/* Uploaded size and pending size */}
                {item.progress === 100 && !item.error
                  ? ` • ${formatSize(item.file.size)} uploaded`
                  : item.progress > 0
                    ? ` • ${formatSize(Math.round((item.file.size * item.progress) / 100))} of ${formatSize(
                        item.file.size,
                      )}`
                    : ` • 0 of ${formatSize(item.file.size)}`}
              </div>
            </div>
          </div>

          {/* Right: Cancel button */}
          <div className='flex items-start justify-end h-full'>
            {onCancel && (
              <Button
                type='button'
                variant='secondary'
                size='icon'
                onClick={onCancel}
                className='h-7 w-7 shrink-0'
                aria-label='Cancel upload'
                title='Cancel upload'
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // uploaded
  const { item, onRemove, disabled, className } = props;
  const image = isImage(item.mimeType);
  const sizeText = formatSize(item.size);

  return (
    <Card className={cn('p-3', className)}>
      <div className='flex items-center justify-between gap-3'>
        {/* Left: preview/icon and file info */}
        <div className='flex items-center gap-3 min-w-0 flex-1'>
          {/* Preview/icon */}
          <div className='flex items-center justify-center bg-muted/40 rounded-md overflow-hidden w-16 h-16 shrink-0'>
            {image ? (
              <img src={item.url} alt={item.name} className='h-full w-full object-cover' />
            ) : (
              <FileText className='h-7 w-7 text-muted-foreground' />
            )}
          </div>

          {/* File info */}
          <div className='min-w-0 flex-1'>
            <div className='text-sm font-medium truncate' title={item.name}>
              {item.name}
            </div>
            <div className='text-xs text-muted-foreground'>{sizeText}</div>
          </div>
        </div>

        {/* Right: Remove button */}
        <div className='flex items-start justify-end h-full'>
          {onRemove && (
            <Button
              type='button'
              variant='secondary'
              size='icon'
              onClick={onRemove}
              className='h-7 w-7 shrink-0'
              disabled={disabled}
              aria-label='Remove file'
              title='Remove file'
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatSize(bytes?: number) {
  if (!bytes && bytes !== 0) return '';
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  if (kb >= 1) return `${kb.toFixed(0)} KB`;
  return `${bytes} B`;
}
