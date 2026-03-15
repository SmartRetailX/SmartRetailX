import {
  IconBrightnessFilled,
  IconBrightnessUp,
  IconCrown,
  IconDeviceDesktop,
  IconLogout,
  IconMoon,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useTheme } from 'next-themes';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type NavUserProps = {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
};

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Clear all local storage on logout
          localStorage.clear();
          window.location.href = '/';
        },
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <Avatar className='h-8 w-8 rounded-lg'>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className='rounded-lg'>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-medium'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='rounded-lg'>CN</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {/* Profile */}
              <DropdownMenuItem
                className={'cursor-pointer'}
                onClick={() => navigate({ to: '/settings', search: { option: 'profile' } })}
              >
                <IconUsers className='mr-2 h-4 w-4' />
                Profile
              </DropdownMenuItem>
              {/* Sources */}
              <DropdownMenuItem
                className='cursor-pointer'
                onClick={() =>
                  navigate({
                    to: '/royalties',
                    replace: false,
                  })
                }
              >
                <IconCrown className='mr-2 h-4 w-4' />
                Royalties
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              {/* Users */}
              <DropdownMenuItem
                className='cursor-pointer'
                onClick={() => navigate({ to: '/users' })}
              >
                <IconUsers className='mr-2 h-4 w-4' />
                Users
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Settings */}
              <DropdownMenuItem
                className='cursor-pointer'
                onClick={() => navigate({ to: '/settings', search: { option: 'profile' } })}
              >
                <IconSettings className='mr-2 h-4 w-4' />
                Settings
              </DropdownMenuItem>

              {/* Theme */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className={cn(
                    "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive! [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                    'cursor-pointer',
                  )}
                >
                  <IconBrightnessFilled className='mr-2 h-4 w-4' />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('light')}>
                      <IconBrightnessUp className='mr-2 h-4 w-4' />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('dark')}>
                      <IconMoon className='mr-2 h-4 w-4' />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('system')}>
                      <IconDeviceDesktop className='mr-2 h-4 w-4' />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem className='cursor-pointer' onClick={handleLogout}>
                <IconLogout className='mr-2 h-4 w-4' />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
