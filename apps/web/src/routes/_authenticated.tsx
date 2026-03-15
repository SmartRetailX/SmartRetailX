import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
  beforeLoad: async ({ context: { auth }, location }) => {
    // Check and redirect if not authenticated
    if (!auth.isAuthenticated) {
      throw redirect({
        to: '/$auth',
        params: { auth: 'sign-in' },
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
