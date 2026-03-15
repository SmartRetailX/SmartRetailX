import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

/**
 * Authenticated layout route - for authenticated users WITH an organization
 * Users who have joined or created an organization
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context: { auth } }) => {
    // If not authenticated, redirect to signin
    if (!auth.isAuthenticated || !auth.user) {
      throw redirect({ to: '/signin' });
    }

    // If user doesn't have an organization, redirect to guest area
    if (!auth.user.organizationId) {
      throw redirect({ to: '/welcome' });
    }
  },
  component: () => <Outlet />,
});
