import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Shield, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/admin/users/')({
  component: AdminUsersPage,
});

/**
 * Admin Users page
 *
 * User management requires a dedicated users endpoint on the API gateway.
 * This page provides the UI scaffold; wire up to an `apiClient.get('/users')`
 * query when the endpoint is available.
 */
function AdminUsersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Users</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage registered customers and administrator accounts
        </p>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            role: 'admin',
            label: 'Administrators',
            description: 'Full access to manage products, orders, and users',
            color: 'bg-[#00A651]/15 text-[#00A651] border-[#00A651]/30',
            icon: Shield,
          },
          {
            role: 'user',
            label: 'Customers',
            description: 'Can browse, add to cart, and place orders',
            color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            icon: Users,
          },
        ].map((item) => (
          <Card key={item.role} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5 flex items-start gap-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.color}`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-100 text-sm">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-100">All Users</CardTitle>
        </CardHeader>
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">Users API endpoint pending</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Connect{' '}
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">GET /api/users</code>{' '}
                on the API gateway and wire it to{' '}
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">useUsersQuery()</code>{' '}
                to populate this table.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-xs">
                Better Auth admin plugin available
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
