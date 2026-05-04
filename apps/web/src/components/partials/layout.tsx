import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { cn } from '@/lib/utils';
import { User, USER_ROLE } from '@/types/auth';

import { AdminShell } from './admin-shell';
import { Footer } from './footer';
import { Header } from './header';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

export function Layout({ children, user, isAuthenticated, signOut }: LayoutProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAdminRoute = pathname.startsWith('/admin');
  const isVoiceAssistantRoute = pathname === '/voice-assistant';
  const shouldLockDocumentScroll = isAdminRoute && user?.role === USER_ROLE.ADMIN;

  useEffect(() => {
    if (!shouldLockDocumentScroll) {
      return;
    }

    const { documentElement, body } = document;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100dvh';

    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, [shouldLockDocumentScroll]);

  if (isAdminRoute && user?.role === USER_ROLE.ADMIN) {
    return (
      <AdminShell user={user} signOut={signOut}>
        {children}
      </AdminShell>
    );
  }

  const showFooter = !isVoiceAssistantRoute && (!user || (user && user.role !== USER_ROLE.ADMIN));
  return (
    <div
      className={cn(
        'flex flex-col bg-background',
        isVoiceAssistantRoute ? 'h-screen overflow-hidden' : 'min-h-screen',
      )}
    >
      <Toaster richColors position="bottom-right" />
      {/* Header */}
      <Header user={user} signOut={signOut} />

      {/* Main Content */}
      <main
        className={cn(
          isVoiceAssistantRoute
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex-1 container mx-auto px-4 py-8',
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  );
}
