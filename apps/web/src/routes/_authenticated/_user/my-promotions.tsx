import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  Loader2,
  Megaphone,
  PackageOpen,
  ShoppingCart,
  Sparkles,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useActivePromotions,
  useMarkAllPromotionsRead,
  useMarkPromotionRead,
  useMyPromotions,
  useStoreMutations,
} from '@/hooks';
import { formatCurrency } from '@/lib/utils';

export const Route = createFileRoute('/_authenticated/_user/my-promotions')({
  component: RouteComponent,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
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

const PROMO_TYPE_LABELS: Record<string, string> = {
  seasonal_offer:  '🌿 Seasonal',
  awrudu_offer:    '🎉 Awrudu',
  christmas_offer: '🎄 Christmas',
  new_year_offer:  '🎆 New Year',
  flash_sale:      '⚡ Flash Sale',
  clearance:       '🏷️ Clearance',
  bundle_deal:     '📦 Bundle',
  loyalty_reward:  '⭐ Loyalty',
};

// ── Store Offers section ──────────────────────────────────────────────────────

function StoreOffersSection() {
  const { data, isLoading }     = useActivePromotions();
  const { addToCart }           = useStoreMutations();
  const [addingId, setAddingId] = useState<string | null>(null);
  const offers                  = data?.data?.promotions ?? [];

  if (isLoading || offers.length === 0) return null;

  function handleAddToCart(productId: string, productName: string) {
    setAddingId(productId);
    addToCart.mutate(
      { productId },
      {
        onSuccess: () => toast.success(`${productName} added to cart`),
        onError:   (e) => toast.error((e as Error).message ?? 'Failed to add to cart'),
        onSettled: () => setAddingId(null),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400">
          Store Offers — Active Now
        </h2>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
          {offers.length}
        </span>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {offers.map((offer) => {
          const endsIn          = daysUntil(offer.endDate);
          const gradient        = discountGradient(offer.discountPercentage);
          const discountedPrice = offer.productPrice * (1 - offer.discountPercentage / 100);
          const isAdding        = addingId === offer.productId;

          return (
            <Card
              key={offer.id}
              className="flex flex-col overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/20"
            >
              <div className="relative h-36 w-full bg-muted/30">
                {offer.productImageUrl ? (
                  <img src={offer.productImageUrl} alt={offer.productName} className="h-full w-full object-cover" />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${gradient} opacity-20`} />
                )}
                <div className={`absolute left-2 top-2 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br ${gradient} px-2 py-1 text-white shadow-md`}>
                  <span className="text-[10px] font-semibold leading-none">OFF</span>
                  <span className="text-lg font-bold leading-tight">{offer.discountPercentage}%</span>
                </div>
                <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  {PROMO_TYPE_LABELS[offer.promotionType] ?? offer.promotionType}
                </span>
              </div>

              <CardContent className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{offer.productName}</p>
                  <p className="text-xs text-muted-foreground">{offer.productCategory}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(discountedPrice)}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(offer.productPrice)}
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  {endsIn > 0 ? `Ends in ${endsIn}d` : 'Ending today'}
                </p>
                <Button
                  size="sm"
                  className="mt-1 w-full gap-1.5"
                  disabled={isAdding}
                  onClick={() => handleAddToCart(offer.productId, offer.productName)}
                >
                  {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  {isAdding ? 'Adding…' : 'Add to Cart'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function RouteComponent() {
  const [filter, setFilter]     = useState<'all' | 'unread'>('all');
  const { data, isLoading, error } = useMyPromotions();
  const markRead                = useMarkPromotionRead();
  const markAllRead             = useMarkAllPromotionsRead();
  const { addToCart }           = useStoreMutations();
  const [addingId, setAddingId] = useState<string | null>(null);

  const serviceDown = !isLoading && (!data || data.success === false || data.promotions === null);
  const promotions  = !isLoading && !serviceDown ? data?.promotions ?? [] : [];
  const unread      = data?.unread ?? 0;
  const visible     = filter === 'unread' ? promotions.filter((p) => !p.is_read) : promotions;

  function handleAddToCart(productId: string, productName: string, notifId: number, isRead: boolean) {
    if (!isRead) markRead.mutate(notifId);
    setAddingId(productId);
    addToCart.mutate(
      { productId },
      {
        onSuccess: () => toast.success(`${productName} added to cart`),
        onError:   (e) => toast.error((e as Error).message ?? 'Failed to add to cart'),
        onSettled: () => setAddingId(null),
      },
    );
  }

  return (
    <PageContainer className="space-y-6 px-2">
      {/* Header */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">My Promotions</h1>
              <p className="text-sm text-muted-foreground">
                {unread > 0
                  ? `${unread} exclusive offer${unread > 1 ? 's' : ''} waiting for you.`
                  : 'Store-wide deals and your personalised offers.'}
              </p>
            </div>
          </div>
          {unread > 0 && (
            <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Store-wide bulk promotions */}
      <StoreOffersSection />

      {/* Personalised section header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-primary">Your Personalised Offers</h2>
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
              <p className="text-base font-semibold">Personalised offers unavailable</p>
              <p className="text-sm text-muted-foreground">
                Your personalised offers will appear here once the service is back online.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {!isLoading && !serviceDown && promotions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total offers', value: promotions.length,          icon: Tag,     color: 'text-primary bg-primary/10' },
            { label: 'Unread',       value: unread,                     icon: Bell,    color: 'text-sky-600 bg-sky-50' },
            { label: 'Read',         value: promotions.length - unread, icon: BellOff, color: 'text-emerald-600 bg-emerald-50' },
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

      {/* Filter tabs */}
      {!isLoading && !serviceDown && (
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((tab) => (
            <Button key={tab} variant={filter === tab ? 'default' : 'outline'} onClick={() => setFilter(tab)}>
              {tab}
              {tab === 'unread' && unread > 0 ? (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{unread}</span>
              ) : null}
            </Button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !serviceDown && visible.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
            <Tag className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold">
                {filter === 'unread' ? 'No unread promotions' : 'No personalised offers yet'}
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

      {/* Personalised promotion cards — grid with image + Add to Cart */}
      {!isLoading && !serviceDown && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((promo) => {
            const expiresDays = promo.expires_at ? daysUntil(promo.expires_at) : null;
            const expiring    = expiresDays !== null && expiresDays <= 3;
            const gradient    = discountGradient(promo.discount_percent);
            const isAdding    = addingId === promo.product_id;

            return (
              <Card
                key={promo.id}
                className={`flex flex-col overflow-hidden transition-shadow hover:shadow-md ${promo.is_read ? 'border-border opacity-80' : 'border-primary/40'}`}
              >
                {/* Product image */}
                <div className="relative h-44 w-full flex-shrink-0 bg-muted/30">
                  {promo.image_url ? (
                    <img src={promo.image_url} alt={promo.product_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${promo.is_read ? 'from-muted to-muted/60' : gradient} opacity-20`} />
                  )}

                  {/* Discount chip */}
                  <div
                    className={`absolute left-2 top-2 flex flex-col items-center justify-center rounded-xl px-2 py-1 shadow-md ${
                      promo.is_read
                        ? 'bg-muted text-muted-foreground'
                        : `bg-gradient-to-br ${gradient} text-white`
                    }`}
                  >
                    <span className="text-[10px] font-semibold leading-none">OFF</span>
                    <span className="text-lg font-bold leading-tight">{promo.discount_percent.toFixed(0)}%</span>
                  </div>

                  {/* Unread dot */}
                  {!promo.is_read && (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary shadow" />
                  )}

                  {/* Expiry badge */}
                  {expiresDays !== null && (
                    <span
                      className={`absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
                        expiring ? 'bg-amber-500/80 text-white' : 'bg-black/40 text-white'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {expiresDays > 0 ? `${expiresDays}d left` : 'Ending today'}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <CardContent className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`line-clamp-2 text-sm font-semibold leading-snug ${promo.is_read ? 'text-muted-foreground' : ''}`}>
                        {promo.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{promo.product_category}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(promo.created_at)}</span>
                  </div>

                  <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">{promo.message}</p>

                  <Button
                    size="sm"
                    variant={promo.is_read ? 'outline' : 'default'}
                    className="mt-auto w-full gap-1.5"
                    disabled={isAdding}
                    onClick={() => handleAddToCart(promo.product_id, promo.product_name, promo.id, promo.is_read)}
                  >
                    {isAdding
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ShoppingCart className="h-3.5 w-3.5" />}
                    {isAdding ? 'Adding…' : 'Add to Cart'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
