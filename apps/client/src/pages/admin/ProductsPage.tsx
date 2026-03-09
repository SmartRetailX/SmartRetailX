import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCoreCreateProduct,
  useCoreDeleteProduct,
  useInfiniteCoreAdminProducts,
  useCoreUpdateProduct,
} from '@/hooks/useCoreProducts'
import type {
  CoreAdminProduct,
  CoreCreateProductInput,
  CoreUpdateProductInput,
} from '@/lib/services/core-products.service'
import { formatCurrency } from '@/lib/utils'
import type { StockStatus } from '@/types/api'

type ProductFormState = {
  sku: string
  name: string
  nameSi: string
  baseProduct: string
  baseProductSi: string
  category: string
  categorySi: string
  price: string
  stockQuantity: string
  imageUrl: string
  description: string
  descriptionSi: string
  isActive: boolean
}

const DEFAULT_FORM_STATE: ProductFormState = {
  sku: '',
  name: '',
  nameSi: '',
  baseProduct: '',
  baseProductSi: '',
  category: '',
  categorySi: '',
  price: '',
  stockQuantity: '0',
  imageUrl: '',
  description: '',
  descriptionSi: '',
  isActive: true,
}

function statusTone(status: StockStatus): string {
  if (status === 'IN_STOCK') return 'bg-green-100 text-green-800'
  if (status === 'LOW_STOCK') return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function toFormState(product?: CoreAdminProduct): ProductFormState {
  if (!product) return { ...DEFAULT_FORM_STATE }

  return {
    sku: product.sku || '',
    name: product.name || '',
    nameSi: product.nameSi || '',
    baseProduct: product.baseProduct || '',
    baseProductSi: product.baseProductSi || '',
    category: product.category || '',
    categorySi: product.categorySi || '',
    price: String(product.price ?? ''),
    stockQuantity: String(product.currentStock ?? 0),
    imageUrl: product.imageUrl || '',
    description: product.description || '',
    descriptionSi: product.descriptionSi || '',
    isActive: product.isActive !== false,
  }
}

function toCreatePayload(form: ProductFormState): CoreCreateProductInput {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    nameSi: form.nameSi.trim() || undefined,
    baseProduct: form.baseProduct.trim() || undefined,
    baseProductSi: form.baseProductSi.trim() || undefined,
    category: form.category.trim() || undefined,
    categorySi: form.categorySi.trim() || undefined,
    price: Number(form.price),
    stockQuantity: Number(form.stockQuantity),
    imageUrl: form.imageUrl.trim() || undefined,
    description: form.description.trim() || undefined,
    descriptionSi: form.descriptionSi.trim() || undefined,
    isActive: form.isActive,
  }
}

function toUpdatePayload(form: ProductFormState): CoreUpdateProductInput {
  return {
    name: form.name.trim(),
    nameSi: form.nameSi.trim() || undefined,
    baseProduct: form.baseProduct.trim() || undefined,
    baseProductSi: form.baseProductSi.trim() || undefined,
    category: form.category.trim() || undefined,
    categorySi: form.categorySi.trim() || undefined,
    price: Number(form.price),
    stockQuantity: Number(form.stockQuantity),
    imageUrl: form.imageUrl.trim() || undefined,
    description: form.description.trim() || undefined,
    descriptionSi: form.descriptionSi.trim() || undefined,
    isActive: form.isActive,
  }
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<CoreAdminProduct | null>(null)
  const [formState, setFormState] = useState<ProductFormState>(DEFAULT_FORM_STATE)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const { data, isLoading, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteCoreAdminProducts({
    search: search || undefined,
    limit: 60,
    sortBy: 'name',
    sortDir: 'asc',
  })
  const createProduct = useCoreCreateProduct()
  const updateProduct = useCoreUpdateProduct()
  const deleteProduct = useCoreDeleteProduct()

  const pages = data?.pages || []
  const products = useMemo(() => pages.flatMap((page) => page.products), [pages])
  const totalProducts = pages[0]?.pagination.total || products.length

  useEffect(() => {
    const node = loadMoreRef.current

    if (!node || !hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '320px 0px' }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, products.length])

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()

    products.forEach((product) => {
      const category = (product.category || '').trim()
      if (category) uniqueCategories.add(category)
    })

    return Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
      return matchesStatus && matchesCategory
    })
  }, [products, statusFilter, categoryFilter])

  const stats = useMemo(() => {
    return filteredProducts.reduce(
      (acc, product) => {
        acc.total += 1
        if (product.status === 'LOW_STOCK') acc.lowStock += 1
        if (product.status === 'OUT_OF_STOCK') acc.outOfStock += 1
        acc.stockValue += Number(product.currentStock || 0) * Number(product.price || 0)
        return acc
      },
      { total: 0, lowStock: 0, outOfStock: 0, stockValue: 0 }
    )
  }, [filteredProducts])

  const isSubmitting = createProduct.isPending || updateProduct.isPending

  const openCreateDialog = () => {
    setEditingProduct(null)
    setFormState(toFormState())
    setSubmitError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (product: CoreAdminProduct) => {
    setEditingProduct(product)
    setFormState(toFormState(product))
    setSubmitError(null)
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingProduct(null)
      setFormState(toFormState())
      setSubmitError(null)
    }
  }

  const onFieldChange = (field: keyof ProductFormState, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    const required = [formState.sku.trim(), formState.name.trim(), formState.price, formState.stockQuantity]
    if ((!editingProduct && required.some((value) => !value)) || (editingProduct && required.slice(1).some((value) => !value))) {
      setSubmitError('SKU, name, price, and stock quantity are required.')
      return
    }

    const price = Number(formState.price)
    const stockQuantity = Number(formState.stockQuantity)

    if (Number.isNaN(price) || Number.isNaN(stockQuantity)) {
      setSubmitError('Price and stock quantity must be valid numbers.')
      return
    }

    try {
      if (editingProduct) {
        const payload = toUpdatePayload(formState)
        await updateProduct.mutateAsync({ productId: editingProduct.id, payload })
      } else {
        const payload = toCreatePayload(formState)
        await createProduct.mutateAsync(payload)
      }

      handleDialogOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save product')
    }
  }

  const handleDelete = async (product: CoreAdminProduct) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return
    }

    setDeleteError(null)
    try {
      await deleteProduct.mutateAsync(product.id)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete product')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="mt-1 text-gray-500">Manage products from Core service endpoints</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.stockValue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKU"
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | StockStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="IN_STOCK">In stock</SelectItem>
                <SelectItem value="LOW_STOCK">Low stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Product List ({filteredProducts.length})
            {!isLoading ? ` - Loaded ${products.length} of ${totalProducts}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d7f44]" />
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <div className="py-10 text-center text-gray-500">No products found</div>
          )}

          {!isLoading && filteredProducts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">SKU</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 text-right font-medium">Price</th>
                    <th className="pb-3 text-right font-medium">Stock</th>
                    <th className="pb-3 text-center font-medium">Status</th>
                    <th className="pb-3 text-center font-medium">Active</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 pr-3">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.nameSi ? <p className="text-xs text-gray-500">{product.nameSi}</p> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">{product.sku}</td>
                      <td className="py-3 pr-3">{product.category || '-'}</td>
                      <td className="py-3 pr-3 text-right">{formatCurrency(product.price)}</td>
                      <td className="py-3 pr-3 text-right">{product.currentStock}</td>
                      <td className="py-3 pr-3 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(product.status)}`}>
                          {product.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-center">{product.isActive === false ? 'No' : 'Yes'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={deleteProduct.isPending}
                            onClick={() => void handleDelete(product)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more products...
                </div>
              ) : (
                <Button variant="outline" onClick={() => void fetchNextPage()}>
                  Load more
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update product fields and save changes.'
                : 'Create a new product using core service endpoints.'}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formState.sku}
                  onChange={(e) => onFieldChange('sku', e.target.value)}
                  placeholder="SKU-001"
                  required
                  disabled={!!editingProduct}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(e) => onFieldChange('name', e.target.value)}
                  placeholder="Product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name-si">Name (Sinhala)</Label>
                <Input
                  id="name-si"
                  value={formState.nameSi}
                  onChange={(e) => onFieldChange('nameSi', e.target.value)}
                  placeholder="Optional Sinhala name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-product">Base Product</Label>
                <Input
                  id="base-product"
                  value={formState.baseProduct}
                  onChange={(e) => onFieldChange('baseProduct', e.target.value)}
                  placeholder="Canonical/base product name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-product-si">Base Product (Sinhala)</Label>
                <Input
                  id="base-product-si"
                  value={formState.baseProductSi}
                  onChange={(e) => onFieldChange('baseProductSi', e.target.value)}
                  placeholder="Canonical/base product name in Sinhala"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formState.category}
                  onChange={(e) => onFieldChange('category', e.target.value)}
                  placeholder="Category"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-si">Category (Sinhala)</Label>
                <Input
                  id="category-si"
                  value={formState.categorySi}
                  onChange={(e) => onFieldChange('categorySi', e.target.value)}
                  placeholder="Optional Sinhala category"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={(e) => onFieldChange('price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-quantity">Stock Quantity *</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formState.stockQuantity}
                  onChange={(e) => onFieldChange('stockQuantity', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={formState.imageUrl}
                  onChange={(e) => onFieldChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is-active">Active</Label>
                <Select
                  value={formState.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) => onFieldChange('isActive', value === 'active')}
                >
                  <SelectTrigger id="is-active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formState.description}
                onChange={(e) => onFieldChange('description', e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description-si">Description (Sinhala)</Label>
              <textarea
                id="description-si"
                value={formState.descriptionSi}
                onChange={(e) => onFieldChange('descriptionSi', e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Optional Sinhala description"
              />
            </div>

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
