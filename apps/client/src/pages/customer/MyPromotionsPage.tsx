import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, CheckCheck, Clock, PackageOpen, Loader2, ShoppingBag } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────

interface PromotionNotification {
  id: number
  customer_id: string
  campaign_id: number | null
  product_id: string
  product_name: string
  product_category: string
  discount_percent: number
  message: string
  is_read: boolean
  expires_at: string | null
  created_at: string
}

interface PromotionsResponse {
  success: boolean
  promotions: PromotionNotification[]
  total: number
  unread: number
}

// ── Helpers ───────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// ── Page ──────────────────────────────────────────────────

export default function MyPromotionsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Fetch
  const { data, isLoading, isError } = useQuery<PromotionsResponse>({
    queryKey: ['my-promotions'],
    queryFn: async () => {
      const res = await apiClient.get<PromotionsResponse>(API_ENDPOINTS.MY_PROMOTIONS.LIST)
      return res.data
    },
    refetchOnWindowFocus: false,
  })

  // Mark one as read
  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(API_ENDPOINTS.MY_PROMOTIONS.MARK_READ(id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-promotions'] }),
  })

  // Mark all as read
  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiClient.patch(API_ENDPOINTS.MY_PROMOTIONS.MARK_ALL_READ)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-promotions'] }),
  })

  const promotions = data?.promotions ?? []
  const unread     = data?.unread ?? 0

  const visible = filter === 'unread'
    ? promotions.filter(p => !p.is_read)
    : promotions

  // ── Render ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <PackageOpen className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Could not load your promotions right now.</p>
        <p className="text-xs text-gray-400">Make sure the promotion engine service is running.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Tag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Promotions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unread > 0
                ? `${unread} new offer${unread > 1 ? 's' : ''} waiting for you`
                : 'All caught up!'}
            </p>
          </div>
        </div>

        {unread > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {f}
            {f === 'unread' && unread > 0 && (
              <span className="ml-1.5 rounded-full bg-violet-500 px-1.5 py-0.5 text-xs text-white">
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-500 dark:text-gray-400">
            {filter === 'unread' ? 'No unread promotions' : 'No promotions yet'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {filter === 'unread'
              ? 'Switch to "All" to see past offers.'
              : 'When the store targets you with a personalised offer, it will appear here.'}
          </p>
        </div>
      )}

      {/* Promotion cards */}
      <div className="space-y-3">
        {visible.map(promo => {
          const expiresDays = promo.expires_at ? daysUntil(promo.expires_at) : null
          const expiring    = expiresDays !== null && expiresDays <= 3
          return (
            <div
              key={promo.id}
              onClick={() => { if (!promo.is_read) markRead.mutate(promo.id) }}
              className={`group relative rounded-xl border p-4 transition-all cursor-pointer ${
                promo.is_read
                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30'
                  : 'border-violet-200 dark:border-violet-700/50 bg-violet-50/60 dark:bg-violet-900/10 shadow-sm'
              }`}
            >
              {/* Unread dot */}
              {!promo.is_read && (
                <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              )}

              <div className="flex items-start gap-3">
                {/* Discount badge */}
                <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl font-bold text-sm ${
                  promo.is_read
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    : 'bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300'
                }`}>
                  -{promo.discount_percent.toFixed(0)}%
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold truncate ${
                      promo.is_read
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {promo.product_name}
                    </p>
                    <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {relativeTime(promo.created_at)}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {promo.product_category}
                  </p>

                  <p className={`mt-1.5 text-sm ${
                    promo.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    {promo.message}
                  </p>

                  {/* Expiry */}
                  {expiresDays !== null && expiresDays > 0 && (
                    <div className={`mt-2 flex items-center gap-1 text-xs ${
                      expiring ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      <Clock className="h-3 w-3" />
                      {expiring
                        ? `Expires in ${expiresDays} day${expiresDays > 1 ? 's' : ''}!`
                        : `Valid for ${expiresDays} more days`}
                    </div>
                  )}
                  {expiresDays !== null && expiresDays <= 0 && (
                    <span className="mt-2 inline-block text-xs text-red-400">Expired</span>
                  )}
                </div>
              </div>

              {/* Read indicator on hover */}
              {!promo.is_read && (
                <p className="mt-2 text-right text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to mark as read
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
