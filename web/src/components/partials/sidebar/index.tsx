import { useNavigate } from '@tanstack/react-router';
import { PanelLeftIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { getSidebarItems } from '@/configs/sidebar-config';
import { UserRole } from '@/types';

import { NavLogo } from './nav-logo';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

type AppSidebarProps = {
  user: {
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
  };
};

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const [hovered, setHovered] = useState<boolean>(false);
  const isCollapsed = state === 'collapsed';

  const navigate = useNavigate();

  // Get the filtered sidebar items based on user role
  const items = getSidebarItems(user.role);

  const handleLogoClick = () => {
    if (isCollapsed) {
      toggleSidebar();
    } else {
      navigate({ to: '/' });
    }
  };

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader className='h-(--h-header) justify-center'>
        <div className='flex items-center justify-between w-full'>
          <Button
            className='text-sm font-bold p-0'
            variant={'ghost'}
            size={'icon'}
            onClick={handleLogoClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {isCollapsed && hovered ? <PanelLeftIcon /> : <NavLogo />}
          </Button>
          <SidebarTrigger size={'icon'} className='h-9 w-9' hidden={isCollapsed && !hovered} />
        </div>
      </SidebarHeader>
      <SidebarContent className='sidebar-thin-scroll overflow-y-auto overflow-x-hidden'>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
