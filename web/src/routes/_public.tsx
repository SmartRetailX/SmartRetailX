import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

/**
 * Public layout route - for unauthenticated users only
 * Redirects to home if user is already authenticated
 */
export const Route = createFileRoute('/_public')({
  beforeLoad: async ({ context: { auth } }) => {
    // If user is authenticated, redirect them based on their role
    if (auth.isAuthenticated && auth.user) {
      // If user has an organization, redirect to dashboard
      if (auth.user.organizationId) {
        throw redirect({ to: '/dashboard' });
      }
      // If user is a guest (no organization), redirect to guest area
      throw redirect({ to: '/welcome' });
    }
  },
  component: () => <Outlet />,
});
