import { useRouterState } from '@tanstack/react-router';

import { User, USER_ROLE } from '@/types/auth';

import { AdminShell } from './admin-shell';
import { Footer } from './footer';
import { Header } from './header';
import { cn } from '@/lib/utils';

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

  if (isAdminRoute && user?.role === USER_ROLE.ADMIN) {
    return (
      <AdminShell user={user} signOut={signOut}>
        {children}
      </AdminShell>
    );
  }

  const showFooter = !isVoiceAssistantRoute && (!user || (user && user.role !== USER_ROLE.ADMIN));
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <Header user={user} signOut={signOut} />

      {/* Main Content */}
      <main
        className={cn(
          'flex-1',
          isVoiceAssistantRoute ? 'min-h-0 overflow-hidden' : 'container mx-auto px-4 py-8',
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  );
}
