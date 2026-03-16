import { User, USER_ROLE } from '@/types/auth';

import { Footer } from './footer';
import { Header } from './header';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

export function Layout({ children, user, isAuthenticated, signOut }: LayoutProps) {
  const showFooter = !user || (user && user.role !== USER_ROLE.ADMIN);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header user={user} signOut={signOut} />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  );
}
