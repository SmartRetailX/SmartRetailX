import { IconPlus } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';

interface TableAddButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export function TableAddButton({ label, onClick, disabled, title }: TableAddButtonProps) {
  return (
    <Button variant='default' size='sm' onClick={onClick} disabled={disabled} title={title}>
      <IconPlus className='h-4 w-4' />
      {label}
    </Button>
  );
}
