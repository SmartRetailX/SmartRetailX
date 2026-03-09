import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, PackageX, Search, ShoppingCart, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useAddToCart } from '@/hooks/useCart'
import { useInfiniteStorefrontProducts } from '@/hooks/useStorefrontProducts'
import { useLanguageStore } from '@/stores/appStore'
import { formatCurrency } from '@/lib/utils'
import type { Language, Product } from '@/types/api'

type CategoryLabels = {
  key: string
  en: string
  si: string
}

const SINHALA_REGEX = /[\u0D80-\u0DFF]/

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeoutId)
  }, [delay, value])

  return debounced
}

function stockLabel(product: Product): { label: string; tone: string } {
  const normalizedStatus = String(product.status).toUpperCase()
  const stock = Number(product.currentStock || product.stock || 0)

  if (normalizedStatus.includes('OUT') || stock <= 0) {
    return {
      label: 'Out of stock',
      tone: 'bg-destructive/10 text-destructive',
    }
  }

  if (normalizedStatus.includes('LOW') || stock <= Math.max(5, Number(product.reorderLevel || 0))) {
    return {
      label: `Low stock (${stock})`,
      tone: 'bg-accent text-accent-foreground',
    }
  }

  return {
    label: `${stock} available`,
    tone: 'bg-secondary/15 text-secondary',
  }
}

function categoryBadgeTone(category: string): string {
  const seed = category.toLowerCase()
  if (seed.includes('beverage') || seed.includes('drink')) {
    return 'bg-primary/10 text-primary'
  }
  if (seed.includes('bakery') || seed.includes('snack')) {
    return 'bg-accent text-accent-foreground'
  }
  if (seed.includes('dairy') || seed.includes('milk')) {
    return 'bg-secondary/15 text-secondary'
  }
  return 'bg-muted text-muted-foreground'
}

function isSinhalaText(value: string): boolean {
  return SINHALA_REGEX.test(value)
}

function pickEnglishText(...values: Array<string | null | undefined>): string {
  const normalized = values.map((value) => (value || '').trim()).filter(Boolean)
  const latinCandidate = normalized.find((value) => !isSinhalaText(value))
  return latinCandidate || normalized[0] || ''
}

function pickSinhalaText(...values: Array<string | null | undefined>): string {
  const normalized = values.map((value) => (value || '').trim()).filter(Boolean)
  const sinhalaCandidate = normalized.find((value) => isSinhalaText(value))
  return sinhalaCandidate || normalized[0] || ''
}

function buildCategoryLabels(category?: string | null, categorySi?: string | null): CategoryLabels {
  const en = pickEnglishText(category, categorySi)
  const si = pickSinhalaText(categorySi, category) || en
  const key = en || si

  return {
    key,
    en: en || key,
    si: si || key,
  }
}

function ProductCard({ product, language }: { product: Product; language: Language }) {
  const addToCart = useAddToCart()
  const [justAdded, setJustAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stock = stockLabel(product)
  const isOutOfStock = stock.label === 'Out of stock'
  const displayName = language === 'si' && product.nameSi ? product.nameSi : product.name
  const categoryLabels = buildCategoryLabels(product.category, product.categorySi)
  const displayCategory = language === 'si' ? categoryLabels.si : categoryLabels.en

  const handleAddToCart = async () => {
    setError(null)
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: 1 })
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart')
      setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <Card
      className="group overflow-hidden border-border bg-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <CardContent className="p-0">
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-muted to-muted/70">
          <div className="text-center">
            <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">{product.sku}</p>
            <p className="mx-auto max-w-[14rem] text-sm font-medium text-foreground">
              {displayName}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold leading-5">
              {displayName}
            </h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadgeTone(
                categoryLabels.en,
              )}`}
            >
              {displayCategory}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
              <p className="text-xs text-muted-foreground">per unit</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${stock.tone}`}>
              {stock.label}
            </span>
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            disabled={isOutOfStock || addToCart.isPending}
            onClick={handleAddToCart}
          >
            {addToCart.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : justAdded ? (
              <Check className="h-4 w-4" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {justAdded ? 'Added!' : 'Add to cart'}
          </Button>
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const { language } = useLanguageStore()
  const [searchInput, setSearchInput] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [categoryOptionsByKey, setCategoryOptionsByKey] = useState<Record<string, CategoryLabels>>({})
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350)
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteStorefrontProducts({
    search: debouncedSearch,
    category: activeCategory,
    limit: 20,
  })

  const products = useMemo(() => {
    return data?.pages.flatMap((page) => page.products) ?? []
  }, [data])

  const totalProducts = data?.pages[0]?.pagination.total ?? products.length

  useEffect(() => {
    if (products.length === 0) {
      return
    }

    setCategoryOptionsByKey((previous) => {
      const next = { ...previous }
      let changed = false

      products.forEach((product) => {
        const labels = buildCategoryLabels(product.category, product.categorySi)
        if (!labels.key) {
          return
        }

        const existing = next[labels.key]
        if (!existing) {
          next[labels.key] = labels
          changed = true
          return
        }

        const merged: CategoryLabels = {
          key: labels.key,
          en: existing.en || labels.en,
          si: existing.si || labels.si,
        }

        if (merged.en !== existing.en || merged.si !== existing.si) {
          next[labels.key] = merged
          changed = true
        }
      })

      return changed ? next : previous
    })
  }, [products])

  const categories = useMemo(() => {
    return Object.values(categoryOptionsByKey).sort((a, b) => {
      const aLabel = language === 'si' ? a.si : a.en
      const bLabel = language === 'si' ? b.si : b.en
      return aLabel.localeCompare(bLabel)
    })
  }, [categoryOptionsByKey, language])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '450px 0px 450px 0px' },
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const errorMessage = error instanceof Error ? error.message : 'Unable to load products right now.'

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground shadow-lg">
        <div className="p-6 md:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold tracking-wide">
            <Sparkles className="h-4 w-4" />
            Fresh picks from your store
          </p>
          <h1 className="text-2xl font-bold md:text-4xl">Shop by category, discover products faster</h1>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/90 md:text-base">
            Welcome back, {user?.name || 'shopper'}. Browse products from the live database with seamless
            infinite scrolling and quick category filtering.
          </p>

          <div className="mt-5 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by product name, SKU, or barcode"
                className="h-11 border-border bg-background text-foreground pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top Categories</h2>
          <p className="text-xs text-muted-foreground">{totalProducts} products available</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            type="button"
            size="sm"
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('all')}
            className="rounded-full"
          >
            All
          </Button>

          {categories.map((category) => (
            <Button
              key={category.key}
              type="button"
              size="sm"
              variant={activeCategory === category.key ? 'default' : 'outline'}
              onClick={() => setActiveCategory(category.key)}
              className="rounded-full"
            >
              {language === 'si' ? category.si : category.en}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-72 animate-pulse rounded-xl border border-border bg-muted"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && products.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <PackageX className="h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Try changing category or search keywords to discover products in your catalog.
              </p>
              <Button type="button" variant="outline" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={`${product.id}-${product.updatedAt || product.createdAt || ''}`}
                product={product}
                language={language}
              />
            ))}
          </div>
        ) : null}

        <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center">
          {isFetchingNextPage ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more products...
            </p>
          ) : null}

          {!isFetchingNextPage && !hasNextPage && products.length > 0 ? (
            <p className="text-xs text-muted-foreground">You have reached the end of the catalog</p>
          ) : null}
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button type="button" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  )
}
