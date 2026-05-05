import { useQuery } from '@tanstack/react-query'
import { Sparkles, PackageOpen, Loader2, ShoppingBag, Tag, TrendingUp } from 'lucide-react'
import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────

interface ProductSuggestion {
  product_id: string
  product_name: string
  category: string
  brand: string
  price: number
  co_buyer_count: number
  confidence_score: number
  because_you_bought: string[]
}

interface SuggestionsResponse {
  success: boolean
  customer_found: boolean
  customer_products_count: number
  suggestions: ProductSuggestion[] | null
  total: number
  error?: string
}

// ── Helpers ───────────────────────────────────────────────

/** Colour pair for the confidence bar based on score */
function confidenceColor(score: number): { bar: string; badge: string } {
  if (score >= 0.5) return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (score >= 0.3) return { bar: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200' }
  if (score >= 0.15) return { bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200' }
  return { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
}

/** Category icon background colour */
function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Electronics: 'bg-blue-100 text-blue-600',
    Clothing:    'bg-pink-100 text-pink-600',
    Food:        'bg-amber-100 text-amber-600',
    Groceries:   'bg-green-100 text-green-600',
    Sports:      'bg-orange-100 text-orange-600',
    Beauty:      'bg-rose-100 text-rose-600',
    Home:        'bg-teal-100 text-teal-600',
    Books:       'bg-indigo-100 text-indigo-600',
  }
  for (const [key, cls] of Object.entries(map)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return cls
  }
  return 'bg-gray-100 text-gray-600'
}

// ── Page ──────────────────────────────────────────────────

export default function ProductSuggestionsPage() {
  const { data, isLoading } = useQuery<SuggestionsResponse>({
    queryKey: ['product-suggestions'],
    queryFn: async () => {
      const res = await apiClient.get<SuggestionsResponse>(
        API_ENDPOINTS.PRODUCT_SUGGESTIONS.LIST,
      )
      return res.data
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  const serviceDown = !isLoading && (!data || data.success === false || data.suggestions === null)
  const noHistory   = !isLoading && !serviceDown && data?.customer_products_count === 0
  const suggestions: ProductSuggestion[] = (!isLoading && !serviceDown) ? (data?.suggestions ?? []) : []

  return (
    <div className="min-h-screen bg-gray-50 pb-12">

      {/* ── Header banner ── */}
      <div className="relative overflow-hidden border-b border-violet-100 bg-gradient-to-r from-violet-100 via-purple-50 to-indigo-200 px-6 py-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-indigo-200/40 blur-2xl" />

        <div className="relative mx-auto flex max-w-4xl items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-md shadow-violet-100 ring-1 ring-violet-100">
            <Sparkles className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">For You</h1>
            <p className="mt-0.5 text-sm text-violet-500/80">
              Products picked based on what customers like you also love
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 pt-6 space-y-6">

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        )}

        {/* ── Service offline ── */}
        {serviceDown && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <PackageOpen className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">Recommendation service is offline</p>
              <p className="mt-1 text-sm text-gray-400">
                Product suggestions will appear here once the service is back online.
              </p>
            </div>
          </div>
        )}

        {/* ── No purchase history ── */}
        {noHistory && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-violet-200 bg-white py-20 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
              <ShoppingBag className="h-8 w-8 text-violet-300" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-700">No purchase history yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Start shopping and we'll recommend products based on what others like you love.
              </p>
            </div>
          </div>
        )}

        {/* ── Stats strip ── */}
        {suggestions.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Suggestions',     value: data?.total ?? 0,                       icon: Sparkles,    color: 'text-violet-600 bg-violet-50' },
              { label: 'Your purchases',  value: data?.customer_products_count ?? 0,     icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
              { label: 'Top confidence',  value: `${((suggestions[0]?.confidence_score ?? 0) * 100).toFixed(0)}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm border border-gray-100">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{s.value}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Product grid ── */}
        {suggestions.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {suggestions.map((product, idx) => {
              const conf   = confidenceColor(product.confidence_score)
              const catCls = categoryColor(product.category)
              const pct    = Math.round(product.confidence_score * 100)

              return (
                <div
                  key={product.product_id}
                  className="group relative overflow-hidden rounded-2xl border border-blue-300 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:border-violet-400"
                >
                  {/* Rank badge */}
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-gray-600">
                    {idx + 1}
                  </div>

                  <div className="p-5">
                    {/* Category chip */}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${catCls}`}>
                      <Tag className="h-3 w-3" />
                      {product.category}
                    </span>

                    {/* Product name + brand */}
                    <h3 className="mt-3 text-base font-bold text-gray-900 leading-tight pr-6">
                      {product.product_name}
                    </h3>
                    {product.brand && (
                      <p className="mt-0.5 text-xs text-gray-400">{product.brand}</p>
                    )}

                    {/* Price */}
                    <p className="mt-3 text-xl font-extrabold text-gray-900">
                      ${product.price.toFixed(2)}
                    </p>

                    {/* Confidence bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Match strength</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${conf.badge}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full transition-all ${conf.bar}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Because you bought */}
                    {product.because_you_bought.length > 0 && (
                      <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5">
                        <p className="text-xs font-medium text-gray-400 mb-1.5">Because you bought</p>
                        <div className="flex flex-wrap gap-1.5">
                          {product.because_you_bought.map(name => (
                            <span
                              key={name}
                              className="rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600 shadow-sm"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Co-buyer count footnote */}
                    <p className="mt-3 text-xs text-gray-400">
                      {product.co_buyer_count} customer{product.co_buyer_count !== 1 ? 's' : ''} with similar taste also bought this
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
