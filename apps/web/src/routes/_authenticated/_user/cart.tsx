import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_user/cart')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Cart page</div>;
}
