import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_user/orders')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Orders page</div>;
}
