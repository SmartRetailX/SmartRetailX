import { useAuth } from '@/hooks';

import { Footer } from './footer';
import { Header } from './header';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header user={user} signOut={signOut} />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
