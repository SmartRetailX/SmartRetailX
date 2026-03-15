import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_admin')({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const { user } = context.auth;

    if (user?.role !== 'admin') {
      throw redirect({
        to: '/',
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
