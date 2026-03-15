import { IconAlertCircle, IconPaperclip, IconUpload, IconX } from '@tabler/icons-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface AttachmentUploaderProps {
  attachments: File[];
  onAttachmentsChange: (attachments: File[]) => void;
  label?: string;
  maxFiles?: number;
  maxSizePerFile?: number; // in bytes
  acceptedFileTypes?: string[];
  className?: string;
  disabled?: boolean;
  showErrors?: boolean;
}

const DEFAULT_ACCEPTED_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.txt',
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeDisplay = (acceptedTypes: string[]): string => {
  const extensions = acceptedTypes.map((type) => type.replace('.', '').toUpperCase());
  if (extensions.length <= 3) {
    return extensions.join(', ');
  }
  return `${extensions.slice(0, 3).join(', ')} and ${extensions.length - 3} more`;
};

export function AttachmentUploader({
  attachments,
  onAttachmentsChange,
  label = 'Attachments',
  maxFiles = 10,
  maxSizePerFile = 10 * 1024 * 1024, // 10MB default
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  className = '',
  disabled = false,
  showErrors = true,
}: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateAndAddFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const validFiles: File[] = [];
    const newErrors: string[] = [];

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxSizePerFile) {
        newErrors.push(`${file.name} is too large (max ${formatFileSize(maxSizePerFile)})`);
        return;
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExtension)) {
        newErrors.push(`${file.name} is not a supported file type`);
        return;
      }

      // Check if we're within the max files limit
      if (attachments.length + validFiles.length >= maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Check for duplicates
      const isDuplicate = attachments.some(
        (existing) => existing.name === file.name && existing.size === file.size,
      );
      if (isDuplicate) {
        newErrors.push(`${file.name} is already attached`);
        return;
      }

      validFiles.push(file);
    });

    setErrors(newErrors);

    if (validFiles.length > 0) {
      onAttachmentsChange([...attachments, ...validFiles]);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(newAttachments);
    // Clear errors when removing files
    setErrors([]);
  };

  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label className={disabled ? 'text-muted-foreground' : ''}>{label}</Label>}

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer',
          isDragOver && !disabled ? 'border-primary bg-primary/5' : 'border-border/40 bg-muted/30',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-border',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <div className='flex flex-col items-center justify-center gap-3 text-center'>
          <div className={cn('p-3 rounded-full', disabled ? 'bg-muted' : 'bg-primary/10')}>
            <IconUpload size={20} className={disabled ? 'text-muted-foreground' : 'text-primary'} />
          </div>
          <p className={cn('text-sm font-medium', disabled ? 'text-muted-foreground' : '')}>
            {disabled ? 'File upload disabled' : 'Drag and drop files here or click to browse'}
          </p>
          <p className='text-xs text-muted-foreground'>
            Supported formats: {getFileTypeDisplay(acceptedFileTypes)}
          </p>
          <p className='text-xs text-muted-foreground'>
            Max {maxFiles} files, {formatFileSize(maxSizePerFile)} per file
          </p>
          <Input
            ref={fileInputRef}
            type='file'
            multiple
            accept={acceptedFileTypes.join(',')}
            className='hidden'
            onChange={handleFileChange}
            disabled={disabled}
          />
          <Button type='button' variant='outline' size='sm' disabled={disabled}>
            Browse Files
          </Button>
        </div>
      </div>

      {/* Error Messages */}
      {showErrors && errors.length > 0 && (
        <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-md'>
          <div className='flex items-start gap-2'>
            <IconAlertCircle size={16} className='text-destructive mt-0.5 flex-shrink-0' />
            <div className='space-y-1'>
              {errors.map((error, index) => (
                <p key={index} className='text-sm text-destructive'>
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className='mt-4'>
          <p className='text-sm text-muted-foreground mb-2'>
            {attachments.length} of {maxFiles} files attached
          </p>
          <ScrollArea className='max-h-[200px]'>
            <div className='space-y-2 pr-4'>
              {attachments.map((file: File, index: number) => (
                <div
                  key={`${file.name}-${index}`}
                  className='flex items-center justify-between p-3 bg-background border rounded-md hover:shadow-sm transition-all'
                >
                  <div className='flex items-center gap-3 overflow-hidden'>
                    <div className='p-1.5 bg-primary/10 rounded-md flex-shrink-0'>
                      <IconPaperclip size={16} className='text-primary' />
                    </div>
                    <div className='overflow-hidden'>
                      <p className='text-sm font-medium truncate'>{file.name}</p>
                      <p className='text-xs text-muted-foreground'>{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(index);
                    }}
                    className='text-muted-foreground hover:text-destructive'
                    disabled={disabled}
                  >
                    <IconX size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
