import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Download, Upload } from 'lucide-react'
import { useProducts, useInventoryStatus } from '@/hooks/useInventory'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils'

export default function InventoryPage() {
  const { t, i18n } = useTranslation()
  const { user, hasRole } = useAuth()
  const isSinhala = i18n.language === 'si'
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: undefined,
    category: undefined,
    storeId: undefined
  })

  const { data: productsData, isLoading } = useProducts({ search, ...filters })
  const { data: inventoryStatus } = useInventoryStatus(filters.storeId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
          <p className="text-gray-500 mt-1">Manage your product inventory</p>
        </div>
        <div className="flex gap-2">
          {hasRole('ADMIN') && (
            <>
              <Button variant="outline" onClick={() => alert('CSV/Excel import coming soon!')}>
                <Upload className="mr-2 h-4 w-4" />
                {t('common.import')}
              </Button>
              <Button onClick={() => alert('Add product form coming soon!')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('inventory.addProduct')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('inventory.totalProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(inventoryStatus?.totalProducts || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('inventory.lowStock')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{inventoryStatus?.lowStockCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('inventory.outOfStock')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{inventoryStatus?.outOfStockCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('inventory.totalValue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(inventoryStatus?.totalValue || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t('common.search') + ' products...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => alert('Export to CSV/Excel coming soon!')}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : productsData?.data && productsData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Stock</th>
                    <th className="text-right p-3">Reorder Level</th>
                    <th className="text-right p-3">Price</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.data.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{isSinhala ? product.nameSi : product.name}</div>
                          <div className="text-sm text-gray-500">{isSinhala ? product.name : product.nameSi}</div>
                        </div>
                      </td>
                      <td className="p-3">{product.category}</td>
                      <td className="text-right p-3">{product.currentStock || product.stock || 0} {product.unit || 'units'}</td>
                      <td className="text-right p-3">{product.reorderLevel}</td>
                      <td className="text-right p-3">{formatCurrency(product.price)}</td>
                      <td className="text-center p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status.toLowerCase() === 'in_stock' ? 'bg-green-100 text-green-800' :
                          product.status.toLowerCase() === 'low_stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right p-3">
                        <Button variant="ghost" size="sm" onClick={() => alert(`Edit product: ${product.name}`)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">{t('common.noData')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
