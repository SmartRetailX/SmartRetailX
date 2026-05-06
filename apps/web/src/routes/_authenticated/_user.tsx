import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_user')({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const { user } = context.auth;

    if (user?.role !== 'user') {
      throw redirect({
        to: user?.role === 'admin' ? '/admin' : '/$auth',
        params: user?.role === 'admin' ? undefined : { auth: 'sign-in' },
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
