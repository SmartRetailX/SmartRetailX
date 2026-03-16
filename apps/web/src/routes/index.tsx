import { useAuth } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';

import { PageContainer } from '@/components/partials/container/page-container';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user, signOut } = useAuth();

  return (
    <PageContainer>
      Welcome, {user?.name || 'Guest'}!
      <span className="block text-sm text-muted-foreground">
        {user ? `Your role: ${user.role}` : 'Please sign in to access more features.'}
      </span>
      {/* Sign Out button */}
      {user && (
        <Button variant="outline" onClick={() => signOut()} className="mt-4">
          Sign Out
        </Button>
      )}
      {!user && (
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/$auth/sign-in')}
          className="mt-4"
        >
          Sign In
        </Button>
      )}
    </PageContainer>
  );
}
