import { Outlet, useLocation } from '@tanstack/react-router';
import { ReactNode } from 'react';

import { getHeaderConfig } from '@/configs/header-config';
import { useAuth } from '@/context/auth-context';

import { Header } from '../partials/header';
import { AppSidebar } from '../partials/sidebar';
import { SidebarInset, SidebarProvider } from '../ui/sidebar';

type AuthenticatedLayoutProps = {
  children?: ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();

  // If no user data, don't render the layout
  if (!user || !isAuthenticated) return null;

  const headerConfig = getHeaderConfig(user.role, pathname);

  return (
    <SidebarProvider sidebarWidth='14rem'>
      <AppSidebar user={user} />
      <SidebarInset className='flex flex-col flex-1 min-w-0 min-h-screen'>
        <Header
          showAvatar={false}
          showSearchBox={headerConfig.showSearch}
          showNotification={headerConfig.showNotifications}
          showBreadcrumb={true}
          showChatToggle={headerConfig.showChatToggle}
        />
        <main className='p-4 flex-1'>{children || <Outlet />}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
