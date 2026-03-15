import { IconLoader2, IconTrash } from '@tabler/icons-react';
import { ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DeleteConfirmAlertProps {
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  children?: ReactNode; // The trigger element
}

export function DeleteConfirmAlert({
  onConfirm,
  isLoading = false,
  title = 'Are you absolutely sure?',
  description = 'This action cannot be undone. This will permanently delete this data from our servers.',
  confirmText = 'Yes, delete',
  cancelText = 'Cancel',
  children,
}: DeleteConfirmAlertProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {/* If children (custom trigger) exists, use it. Otherwise use default trash button */}
        {children ? (
          children
        ) : (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-muted-foreground hover:text-destructive transition-colors'
            disabled={isLoading}
          >
            <IconTrash className='h-4 w-4' />
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              'focus:ring-destructive',
            )}
          >
            {isLoading && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
