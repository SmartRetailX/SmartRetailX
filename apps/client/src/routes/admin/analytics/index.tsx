import { createFileRoute } from '@tanstack/react-router';
import { BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/admin/analytics/')({
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Sales trends, customer insights, and performance metrics
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-base font-semibold text-slate-100">
            BI Dashboard Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00A651]/10 border border-[#00A651]/20">
              <BarChart3 className="h-8 w-8 text-[#00A651]" />
            </div>
            <div>
              <p className="font-semibold text-slate-200">BI Dashboard ML Service</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Connect to{' '}
                <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">
                  bi-dashboard-services-gateway
                </code>{' '}
                to display sales analytics, revenue trends, and customer segmentation charts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
