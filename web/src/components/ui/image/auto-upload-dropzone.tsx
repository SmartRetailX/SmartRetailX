import { ImagePlus, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import FileService from '@/services/file.service';

interface AutoUploadImageDropzoneProps {
  value?: string;
  disabled?: boolean;
  width?: string;
  height?: string;
  className?: string;
  placeholder?: string;
  onChange: (url: string | undefined) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

export function AutoUploadImageDropzone({
  value,
  disabled,
  width = '194px',
  height = '194px',
  className,
  placeholder = 'Upload Cover Image',
  onChange,
  onUploadingChange,
}: AutoUploadImageDropzoneProps) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Update preview when value changes externally
  useEffect(() => {
    setPreview(value);
  }, [value]);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  const uploadImage = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const result = await FileService.uploadImage(file, (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percentage);
        });

        // Update preview and call onChange with the final URL
        setPreview(result.previewUrl);
        onChange(result.previewUrl);
        toast.success('Image uploaded successfully');
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [onChange],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some((e) => e.code === 'file-too-large')) {
          toast.error('Image must be less than 5MB');
        } else if (rejection.errors.some((e) => e.code === 'file-invalid-type')) {
          toast.error('Please upload a valid image file (PNG, JPG, JPEG, WebP)');
        } else {
          toast.error('Invalid file');
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Start upload immediately
      uploadImage(file);
    },
    [uploadImage],
  );

  const handleRemove = useCallback(() => {
    setPreview(undefined);
    onChange(undefined);
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: {
      'image/png': [],
      'image/jpg': [],
      'image/jpeg': [],
      'image/webp': [],
      'image/gif': [],
      'image/svg+xml': [],
    },
    disabled: disabled || isUploading,
  });

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      {preview && !isUploading ? (
        <div className='relative group h-full w-full'>
          <img
            src={preview}
            alt='Uploaded image'
            className='w-full h-full object-cover rounded-md border'
          />
          <Button
            type='button'
            variant='secondary'
            size='icon'
            onClick={handleRemove}
            className='absolute top-2 right-2 h-8 w-8 opacity-80 group-hover:opacity-100 transition-opacity duration-200 z-10'
            disabled={disabled}
          >
            <X className='h-4 w-4' />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 h-full w-full cursor-pointer transition-colors',
            'bg-muted/30 hover:bg-muted/50',
            isDragActive && 'border-primary bg-primary/10',
            (disabled || isUploading) && 'opacity-60 cursor-not-allowed hover:bg-muted/30',
          )}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className='flex flex-col items-center gap-3 px-4'>
              <Loader2 className='h-8 w-8 text-primary animate-spin' />
              <div className='w-full max-w-32'>
                <Progress value={uploadProgress} className='h-2' />
              </div>
              <p className='text-sm font-medium'>Uploading... {uploadProgress}%</p>
            </div>
          ) : (
            <>
              <ImagePlus className='h-10 w-10 text-muted-foreground' />
              <div className='text-center px-4'>
                <p className='text-sm font-medium'>
                  {isDragActive ? 'Drop image here...' : placeholder}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Drag and drop or click to upload (max 5MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
