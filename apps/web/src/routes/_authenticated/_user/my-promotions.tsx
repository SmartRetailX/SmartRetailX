import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Bell, BellOff, CheckCheck, Clock, PackageOpen, Tag } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMarkAllPromotionsRead, useMarkPromotionRead, useMyPromotions } from '@/hooks';

export const Route = createFileRoute('/_authenticated/_user/my-promotions')({
  component: RouteComponent,
});

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function discountGradient(pct: number): string {
  if (pct >= 40) return 'from-rose-500 to-orange-500';
  if (pct >= 25) return 'from-violet-500 to-purple-600';
  if (pct >= 15) return 'from-blue-500 to-cyan-500';
  return 'from-emerald-500 to-teal-500';
}

function RouteComponent() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data, isLoading, error } = useMyPromotions();
  const markRead = useMarkPromotionRead();
  const markAllRead = useMarkAllPromotionsRead();

  const serviceDown = !isLoading && (!data || data.success === false || data.promotions === null);
  const promotions = !isLoading && !serviceDown ? data?.promotions ?? [] : [];
  const unread = data?.unread ?? 0;

  const visible = filter === 'unread'
    ? promotions.filter((promo) => !promo.is_read)
    : promotions;

  return (
    <PageContainer className="space-y-6">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">My promotions</h1>
              <p className="text-sm text-muted-foreground">
                {unread > 0
                  ? `${unread} exclusive offer${unread > 1 ? 's' : ''} waiting for you.`
                  : 'You are all caught up.'}
              </p>
            </div>
          </div>

          {unread > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load promotions</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 items-center justify-center text-muted-foreground">
            Loading promotions...
          </CardContent>
        </Card>
      )}

      {serviceDown && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">Promotion service is offline</p>
              <p className="text-sm text-muted-foreground">
                Your personalised offers will appear here once the service is back online.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !serviceDown && promotions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total offers', value: promotions.length, icon: Tag, color: 'text-primary bg-primary/10' },
            { label: 'Unread', value: unread, icon: Bell, color: 'text-sky-600 bg-sky-50' },
            { label: 'Read', value: promotions.length - unread, icon: BellOff, color: 'text-emerald-600 bg-emerald-50' },
          ].map((stat) => (
            <Card key={stat.label} size="sm">
              <CardContent className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !serviceDown && (
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((tab) => (
            <Button
              key={tab}
              variant={filter === tab ? 'default' : 'outline'}
              onClick={() => setFilter(tab)}
            >
              {tab}
              {tab === 'unread' && unread > 0 ? (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {unread}
                </span>
              ) : null}
            </Button>
          ))}
        </div>
      )}

      {!isLoading && !serviceDown && visible.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
            <Tag className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">
                {filter === 'unread' ? 'No unread promotions' : 'No promotions yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread'
                  ? 'Switch to "All" to review past offers.'
                  : 'Personalised offers will appear here when the store targets you.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !serviceDown && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((promo) => {
            const expiresDays = promo.expires_at ? daysUntil(promo.expires_at) : null;
            const expiring = expiresDays !== null && expiresDays <= 3;
            const gradient = discountGradient(promo.discount_percent);

            return (
              <Card
                key={promo.id}
                className={promo.is_read ? 'border-border' : 'border-primary/50'}
                onClick={() => {
                  if (!promo.is_read) {
                    markRead.mutate(promo.id);
                  }
                }}
              >
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${promo.is_read ? 'from-muted to-muted/60 text-muted-foreground' : gradient} text-white`}
                      >
                        <span className="text-xs font-semibold">OFF</span>
                        <span className="text-lg font-semibold">
                          {promo.discount_percent.toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <p className={`text-base font-semibold ${promo.is_read ? 'text-muted-foreground' : ''}`}>
                          {promo.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{promo.product_category}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{relativeTime(promo.created_at)}</span>
                  </div>

                  <p className="text-sm text-muted-foreground">{promo.message}</p>

                  <div className="flex items-center justify-between">
                    {expiresDays !== null ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${expiring ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-muted text-muted-foreground'}`}
                      >
                        <Clock className="h-3 w-3" />
                        {expiresDays > 0 ? `Expires in ${expiresDays}d` : 'Expired'}
                      </span>
                    ) : (
                      <span />
                    )}

                    {!promo.is_read ? (
                      <span className="text-xs text-primary">Tap to mark as read</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
