import { createFileRoute } from '@tanstack/react-router';
import { Settings } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/admin/settings/')({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage store configuration and preferences</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-400" />
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-slate-500">
            Store settings (shipping zones, tax configuration, payment gateways) will be available
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
