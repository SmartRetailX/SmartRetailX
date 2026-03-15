import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface OrganizationSelectableUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  image?: string;
}

interface OrganizationUserSelectorProps {
  users: OrganizationSelectableUser[];
  selectedUsers: OrganizationSelectableUser[];
  onSelectionChange: (users: OrganizationSelectableUser[]) => void;
  placeholder?: string;
  showClearButton?: boolean;
  trigger?: React.ReactNode;
  className?: string;
}

export function OrganizationUserSelector({
  users,
  selectedUsers,
  onSelectionChange,
  placeholder = 'Select users...',
  showClearButton = true,
  trigger,
  className,
}: OrganizationUserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
      );
    });
  }, [users, searchTerm]);

  const handleSelectUser = (user: OrganizationSelectableUser) => {
    const isSelected = selectedUsers.some((selectedUser) => selectedUser.id === user.id);

    if (isSelected) {
      onSelectionChange(selectedUsers.filter((selectedUser) => selectedUser.id !== user.id));
      return;
    }

    onSelectionChange([...selectedUsers, user]);
  };

  const shouldShowClearButton = showClearButton && !trigger;

  return (
    <div className={cn(trigger ? '' : 'w-full', className)}>
      <div className='flex items-center gap-2'>
        <Popover
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setSearchTerm('');
            }
            setIsOpen(open);
          }}
          modal
        >
          <PopoverTrigger asChild>
            {trigger ? (
              trigger
            ) : (
              <Button variant='outline' role='combobox' className='w-full justify-between px-3'>
                <div className='flex items-center gap-1 min-w-0 overflow-hidden'>
                  {selectedUsers.length === 0 ? (
                    <span className='text-muted-foreground'>{placeholder}</span>
                  ) : (
                    <div className='flex items-center gap-2 min-w-0'>
                      <span className='truncate text-sm'>Select more...</span>
                      <Badge variant='default' className='text-[10px] h-4 px-1 shrink-0 uppercase'>
                        {selectedUsers.length}
                      </Badge>
                    </div>
                  )}
                </div>

                <IconChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </Button>
            )}
          </PopoverTrigger>

          <PopoverContent
            className='w-100 p-0'
            align='start'
            onPointerDownOutside={() => setIsOpen(false)}
            onFocusOutside={(event) => {
              event.preventDefault();
            }}
            onEscapeKeyDown={() => setIsOpen(false)}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder='Search users...'
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList className='max-h-75'>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {filteredUsers.map((user) => {
                    const selectedCount = selectedUsers.filter(
                      (selectedUser) => selectedUser.id === user.id,
                    ).length;

                    return (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => handleSelectUser(user)}
                        onPointerDown={(event) => event.preventDefault()}
                        className='p-0 aria-selected:bg-transparent'
                      >
                        <OrganizationUserListItem user={user} selectedCount={selectedCount} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {shouldShowClearButton && selectedUsers.length > 0 && (
          <Button
            title='Remove all selected users'
            variant='ghost'
            size='icon'
            onClick={() => onSelectionChange([])}
            className='shrink-0 hover:bg-destructive/10 hover:text-destructive'
          >
            <IconX className='h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  );
}

const OrganizationUserListItem = ({
  user,
  selectedCount,
}: {
  user: OrganizationSelectableUser;
  selectedCount: number;
}) => {
  const isSelected = selectedCount > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full p-2 transition-colors rounded-md',
        isSelected ? 'bg-primary/5' : 'hover:bg-accent',
      )}
    >
      <div className='relative h-10 w-10 shrink-0'>
        <Avatar className='h-10 w-10 border'>
          <AvatarImage src={user.image} alt={user.name} />
          <AvatarFallback>{user.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>

        {isSelected && (
          <div className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background'>
            <IconCheck className='h-3 w-3' />
          </div>
        )}
      </div>

      <div className='flex-1 overflow-hidden'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-sm font-medium truncate'>{user.name || 'Unknown user'}</p>
          {user.role && (
            <Badge variant='outline' className='text-[10px] h-4 px-1 shrink-0 uppercase'>
              {user.role}
            </Badge>
          )}
        </div>

        <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
          <span className='truncate'>{user.email || 'No email'}</span>
        </div>
      </div>
    </div>
  );
};
