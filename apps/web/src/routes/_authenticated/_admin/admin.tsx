import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_admin/admin')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
