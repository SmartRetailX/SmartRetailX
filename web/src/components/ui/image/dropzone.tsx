import { ImagePlus, X } from 'lucide-react';
import React from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ImageUploaderDropzoneProps {
  form: ReturnType<typeof useForm>;
  disabled?: boolean;
}

export function ImageUploaderDropzone({ form, disabled }: ImageUploaderDropzoneProps) {
  const [preview, setPreview] = React.useState<string | null>(() => {
    const currentValue = form.getValues('image');
    if (
      typeof currentValue === 'string' &&
      currentValue &&
      (currentValue.startsWith('http://') || currentValue.startsWith('https://'))
    ) {
      return currentValue;
    }
    return null;
  });
  const objectUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Watch for changes in the form's image value
    const subscription = form.watch((value, { name }) => {
      if (name === 'image') {
        const imageValue = value.image;
        if (
          typeof imageValue === 'string' &&
          imageValue &&
          (imageValue.startsWith('http://') || imageValue.startsWith('https://'))
        ) {
          // Clean up previous object URL if it exists
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          setPreview(imageValue);
        } else if (!imageValue) {
          // Clean up when image is cleared
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          setPreview(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      // Cleanup object URL on unmount
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [form]);

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some((e) => e.code === 'file-too-large')) {
          toast.error('Image must be less than 1MB');
        } else if (rejection.errors.some((e) => e.code === 'file-invalid-type')) {
          toast.error('Please upload a valid image file (PNG, JPG, JPEG)');
        } else {
          toast.error('Invalid file');
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Clean up previous object URL if it exists
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      // Create a preview URL for the selected image
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPreview(objectUrl);

      form.setValue('image', file);
      form.clearErrors('image');
    },
    [form],
  );

  const handleRemove = React.useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(null);
    form.setValue('image', '');
  }, [form]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 1000000, // 1MB
    accept: {
      'image/png': [],
      'image/jpg': [],
      'image/jpeg': [],
      'image/webp': [],
    },
    disabled,
  });

  return (
    <FormItem className='w-full h-full'>
      <FormControl>
        <div className='w-full h-full relative'>
          {preview ? (
            <div className='relative group h-full w-full'>
              <img
                src={preview}
                alt='Contract cover'
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
                disabled && 'opacity-60 cursor-not-allowed hover:bg-muted/30',
              )}
            >
              <Input {...getInputProps()} />
              <ImagePlus className='h-10 w-10 text-muted-foreground' />
              <div className='text-center px-4'>
                <p className='text-sm font-medium'>
                  {isDragActive ? 'Drop image here...' : 'Upload Cover Image'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Drag and drop or click to upload (max 1MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </FormControl>
      {fileRejections.length > 0 && (
        <FormMessage>Image must be less than 1MB and of type PNG, JPG, JPEG, or WebP</FormMessage>
      )}
    </FormItem>
  );
}
