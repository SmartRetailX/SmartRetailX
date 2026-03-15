import { Button } from '@/components/ui/button';
import {
  DropdownMenu as DropdownMenuComponent,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DropdownMenu({
  trigger,
  content,
}: {
  trigger?: React.ReactNode;
  content?: React.ReactNode;
}) {
  return (
    <DropdownMenuComponent>
      <DropdownMenuTrigger asChild>
        {trigger ?? <Button variant='outline'>Open</Button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {content ?? <DropdownMenuLabel>No Content</DropdownMenuLabel>}
      </DropdownMenuContent>
    </DropdownMenuComponent>
  );
}
