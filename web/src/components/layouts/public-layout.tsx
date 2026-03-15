import { Outlet } from '@tanstack/react-router';
import { ReactNode } from 'react';

import { Header } from '@/components/partials/header';

export function PublicLayout({ children }: { children?: ReactNode }) {
  return (
    <>
      <Header showAvatar={true} />
      <main className='p-4 flex-1'>{children || <Outlet />}</main>
    </>
  );
}
