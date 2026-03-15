import { Outlet } from '@tanstack/react-router';

import { AuthenticatedLayout } from '@/components/layouts/authenticated-layout';
import { PublicLayout } from '@/components/layouts/public-layout';
import { getLayoutConfig } from '@/configs/layout-config';
import { useAuth } from '@/context/auth-context';

export const Layout = () => {
  const { user } = useAuth();
  const role = user?.role;

  const { showSidebar } = getLayoutConfig(role);

  // With sidebar layout
  if (showSidebar) {
    return (
      <AuthenticatedLayout>
        <Outlet />
      </AuthenticatedLayout>
    );
  }

  // Without sidebar layout
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
};
