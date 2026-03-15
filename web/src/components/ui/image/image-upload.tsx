import { ImageIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormControl } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: File | string;
  onChange: (file?: File | string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  width?: string;
  height?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled,
  width = '100%',
  height = '100%',
  title,
  description,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(() => {
    if (typeof value === 'string') return value;
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Cleanup object URL on unmount
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up previous object URL if it exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    // Set loading state
    setIsLoading(true);

    // Create a preview URL for the selected image
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    // Create a new image to handle the onload event
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      setPreview(objectUrl);
    };
    img.onerror = () => {
      setIsLoading(false);
      // Optionally handle error
    };
    img.src = objectUrl;

    onChange(file);

    // Clean up the input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemove = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(null);
    onChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <FormControl>
      <div className='flex h-full w-full'>
        {preview ? (
          <div
            className='relative group h-full w-full flex items-center justify-center'
            style={{ width, height }}
          >
            <img
              src={preview}
              alt='Preview'
              className='max-h-full max-w-full object-contain rounded-md border'
              style={{ width: 'auto', height: 'auto' }}
            />
            <Button
              type='button'
              variant='secondary'
              size='icon'
              onClick={handleRemove}
              className='absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10'
              disabled={disabled}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        ) : isLoading ? (
          <div className='h-full w-full flex items-center justify-center' style={{ width, height }}>
            <Skeleton className='rounded-md h-[90%] w-[90%]' />
          </div>
        ) : (
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 h-full w-full',
              'bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer',
              disabled && 'opacity-60 cursor-not-allowed hover:bg-muted/30',
            )}
            style={{ width, height }}
          >
            <ImageIcon className='h-10 w-10 text-muted-foreground' />
            <div className='text-center'>
              <p className='text-sm font-medium'>{title || 'Upload Image'}</p>
              <p className='text-xs text-muted-foreground'>
                {description || 'Drag and drop or click to upload'}
              </p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileChange}
          className='hidden'
          disabled={disabled}
        />
      </div>
    </FormControl>
  );
}
