import { IconUser } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';
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
import { USER_ROLE } from '@/constants';
import { useAuth } from '@/context/auth-context';
import { authClient } from '@/lib/auth-client';

export function UserAvatar() {
  const { user, isAuthenticated } = useAuth();

  const isGuest = user?.role === USER_ROLE.GUEST;

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

  const handleLogin = () => {
    navigate({ to: '/' });
  };

  const handleSignUp = () => {
    navigate({ to: '/signup' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className='cursor-pointer rounded-full' style={{ width: '36px', height: '36px' }}>
          {/* Avatar Image */}
          <AvatarImage src={user?.image || undefined} alt='user' />
          <AvatarFallback>
            <IconUser className='h-4 w-4' />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='w-56'>
        {isAuthenticated ? (
          <>
            <DropdownMenuLabel>{user?.name || user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ThemeChangeMenu />
            {!isGuest && (
              <>
                <DropdownMenuGroup>
                  {/* Profile */}
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={() => navigate({ to: '/settings', search: { option: 'profile' } })}
                  >
                    Profile
                  </DropdownMenuItem>
                  {/* Settings */}
                  <DropdownMenuItem
                    className='cursor-pointer'
                    onClick={() => navigate({ to: '/settings', search: { option: 'general' } })}
                  >
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            {/* Log Out */}
            <DropdownMenuItem className='cursor-pointer' onClick={handleLogout}>
              Log out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <ThemeChangeMenu />
            <DropdownMenuItem className='cursor-pointer' onClick={() => handleLogin()}>
              <span>Login</span>
            </DropdownMenuItem>
            <DropdownMenuItem className='cursor-pointer' onClick={() => handleSignUp()}>
              <span>Sign Up</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ThemeChangeMenu = () => {
  const { setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className='cursor-pointer'>
        <span>Theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('light')}>
            <Sun className='mr-2 h-4 w-4' />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('dark')}>
            <Moon className='mr-2 h-4 w-4' />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('system')}>
            <Monitor className='mr-2 h-4 w-4' />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};
