import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Root route - redirects users based on authentication state
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context: { auth } }) => {
    // If not authenticated, redirect to signin
    if (!auth.isAuthenticated || !auth.user) {
      throw redirect({ to: '/signin' });
    }

    // If user has an organization, redirect to dashboard
    if (auth.user.organizationId) {
      throw redirect({ to: '/dashboard' });
    }

    // If user is a guest (no organization), redirect to welcome
    throw redirect({ to: '/welcome' });
  },
  component: () => null,
});
