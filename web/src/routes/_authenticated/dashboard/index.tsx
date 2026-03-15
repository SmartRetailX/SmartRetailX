import { createFileRoute } from '@tanstack/react-router';

import { useAuth } from '@/context/auth-context';

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  // Type guard - user should always exist in _authenticated routes
  if (!user) {
    return null;
  }

  return <>dasho</>;
}
