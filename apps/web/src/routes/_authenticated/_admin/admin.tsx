import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_admin/admin')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Admin page</div>;
}
