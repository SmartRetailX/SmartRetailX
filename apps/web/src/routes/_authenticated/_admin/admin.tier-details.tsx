import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/_admin/admin/tier-details')({
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = new URLSearchParams(window.location.search);
  const tierId = searchParams.get('id');

  return (
    <div className="p-6">
      {tierId ? (
        <div>
          <h1 className="text-2xl font-semibold mb-2">Tier Details</h1>
          <p className="text-sm text-gray-600">Viewing details for tier ID: <strong>{tierId}</strong></p>
        </div>
      ) : (
        <div className="text-red-600">No tier id provided.</div>
      )}
    </div>
  );
}
