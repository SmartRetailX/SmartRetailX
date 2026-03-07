import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Filter, TrendingUp } from 'lucide-react'
import { useSalesAggregate } from '@/hooks/useSales'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts'

export default function RevenuePage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isSinhala = i18n.language === 'si'
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({})
  
  const { data: salesData, isLoading } = useSalesAggregate({
    ...dateRange
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('revenue.title')}</h1>
          <p className="text-gray-500 mt-1">Comprehensive revenue analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => alert('Date range filter coming soon!')}>
            <Filter className="mr-2 h-4 w-4" />
            {t('common.filter')}
          </Button>
          <Button onClick={() => alert('Export to CSV/PDF coming soon!')}>
            <Download className="mr-2 h-4 w-4" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('revenue.totalRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(salesData?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatNumber(salesData?.totalOrders || 0)} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('revenue.averageOrder')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(salesData?.averageOrderValue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center">
              <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
              +12.5%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('revenue.trendChart')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={salesData?.dailyTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" orientation="left" stroke="#0ea5e9">
                <Label value="Revenue (LKR)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
              </YAxis>
              <YAxis yAxisId="right" orientation="right" stroke="#10b981">
                <Label value="Orders" angle={90} position="insideRight" style={{ textAnchor: 'middle' }} />
              </YAxis>
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Revenue') return [formatCurrency(value), name]
                  return [value, name]
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                name="Revenue"
                dot={false}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="orders" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Orders"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>{t('revenue.topProducts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">Quantity</th>
                  <th className="text-right p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {salesData?.topProducts?.map((product, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{isSinhala && product.productNameSi ? product.productNameSi : product.productName}</td>
                    <td className="text-right p-2">{formatNumber(product.quantity || product.totalQuantity || 0)}</td>
                    <td className="text-right p-2">{formatCurrency(product.revenue || product.totalRevenue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
