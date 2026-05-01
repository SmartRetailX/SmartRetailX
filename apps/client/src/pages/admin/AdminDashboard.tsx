import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  DollarSign, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp,
  Package,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  RefreshCw,
  Zap,
  ArchiveRestore,
  PackageSearch
} from 'lucide-react'
import { useDashboard } from '@/hooks/useAnalytics'
import { useAlerts, useAcceptAlert, useGenerateAlerts, useAutoDismissAlerts } from '@/hooks/useAlerts'
import { useRestockExplanation } from '@/hooks/useForecasts'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isSinhala = i18n.language === 'si'
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [showXAIModal, setShowXAIModal] = useState(false)
  
  const { data: dashboardData, isLoading, refetch: refetchDashboard } = useDashboard({
    period: 'month',
  })
  const { data: alerts, refetch: refetchAlerts } = useAlerts()
  const acceptAlertMutation = useAcceptAlert()
  const generateAlertsMutation = useGenerateAlerts()
  const autoDismissAlertsMutation = useAutoDismissAlerts()
  const { data: explanation } = useRestockExplanation(selectedAlertId || '')

  const handleRefreshDashboard = async () => {
    await Promise.all([
      refetchDashboard(),
      refetchAlerts(),
    ])
  }

  const handleGenerateAlerts = async () => {
    try {
      await generateAlertsMutation.mutateAsync()
      await handleRefreshDashboard()
    } catch (error) {
      console.error('Failed to generate alerts:', error)
    }
  }

  const handleAutoDismissAlerts = async () => {
    try {
      await autoDismissAlertsMutation.mutateAsync()
      await handleRefreshDashboard()
    } catch (error) {
      console.error('Failed to auto-dismiss alerts:', error)
    }
  }

  const handleAcceptAlert = async (alertId: string) => {
    try {
      await acceptAlertMutation.mutateAsync(alertId)
    } catch (error) {
      console.error('Failed to accept alert:', error)
    }
  }

  const handleShowExplanation = (alertId: string) => {
    setSelectedAlertId(alertId)
    setShowXAIModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  const kpis = dashboardData?.kpis || {
    totalRevenue: { value: 0, change: 0, trend: 'stable' as const },
    totalOrders: { value: 0, change: 0, trend: 'stable' as const },
    activeAlerts: { value: 0, change: 0, trend: 'stable' as const },
    criticalAlerts: { value: 0, change: 0, trend: 'stable' as const },
    forecastAccuracy: { value: 0, change: 0, trend: 'stable' as const },
    totalProducts: { value: 0, change: 0, trend: 'stable' as const },
    lowStockProducts: { value: 0, change: 0, trend: 'stable' as const }
  }

  const kpiCards = [
    {
      title: t('dashboard.kpis.revenue'),
      value: formatCurrency(kpis.totalRevenue.value),
      change: kpis.totalRevenue.change,
      trend: kpis.totalRevenue.trend,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: t('dashboard.kpis.orders'),
      value: formatNumber(kpis.totalOrders.value),
      change: kpis.totalOrders.change,
      trend: kpis.totalOrders.trend,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: t('dashboard.kpis.alerts'),
      value: kpis.activeAlerts.value,
      change: kpis.activeAlerts.change,
      trend: kpis.activeAlerts.trend,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    {
      title: t('dashboard.kpis.forecast'),
      value: `${kpis.forecastAccuracy.value.toFixed(1)}%`,
      change: kpis.forecastAccuracy.change,
      trend: kpis.forecastAccuracy.trend,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      title: 'Total Products',
      value: kpis.totalProducts.value,
      change: kpis.totalProducts.change,
      trend: kpis.totalProducts.trend,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20'
    },
    {
      title: 'Low Stock Products',
      value: kpis.lowStockProducts.value,
      change: kpis.lowStockProducts.change,
      trend: kpis.lowStockProducts.trend,
      icon: Package,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {user?.name}!
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={handleRefreshDashboard}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleGenerateAlerts} disabled={generateAlertsMutation.isPending}>
            <Zap className="mr-2 h-4 w-4" />
            {generateAlertsMutation.isPending ? 'Generating...' : 'Generate Alerts'}
          </Button>
          <Button variant="outline" onClick={handleAutoDismissAlerts} disabled={autoDismissAlertsMutation.isPending}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            {autoDismissAlertsMutation.isPending ? 'Processing...' : 'Auto-Dismiss'}
          </Button>
          <Button onClick={() => navigate('/inventory')}>
            <PackageSearch className="mr-2 h-4 w-4" />
            Inventory
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center text-xs mt-1">
                  {kpi.trend === 'up' ? (
                    <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : kpi.trend === 'down' ? (
                    <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                  ) : null}
                  <span className={
                    kpi.trend === 'up' ? 'text-green-600' :
                    kpi.trend === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }>
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last period</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.salesTrend')}</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData?.salesTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.topProducts')}</CardTitle>
            <CardDescription>Best performing items</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData?.topProducts?.slice(0, 5) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.alerts')}</CardTitle>
          <CardDescription>Action required items</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">{isSinhala ? alert.productNameSi : alert.productName}</p>
                      <p className="text-sm text-gray-600">{isSinhala ? alert.reasonSi : alert.reason || alert.message}</p>
                      {alert.currentStock !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          Current stock: {alert.currentStock} | Recommended: {alert.recommendedQuantity}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleShowExplanation(alert.id)}>
                      <HelpCircle className="mr-1 h-3 w-3" />
                      {t('xai.explain')}
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleAcceptAlert(alert.id)}
                      disabled={acceptAlertMutation.isPending}
                    >
                      {t('alerts.accept')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              {t('common.noData')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* XAI Explanation Modal */}
      <Dialog open={showXAIModal} onOpenChange={setShowXAIModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              AI Restock Explanation
            </DialogTitle>
            <DialogDescription>
              Understanding why AI recommends this restock action
            </DialogDescription>
          </DialogHeader>
          
          {explanation ? (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Product</p>
                    <p className="text-xl font-bold">{explanation.productName}</p>
                    <p className="text-xs text-gray-500 mt-1">Model: {explanation.modelType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Confidence</p>
                    <p className="text-2xl font-bold text-green-600">{(explanation.confidence * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Explanation Text */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">AI Analysis</h3>
                <p className="text-sm leading-relaxed">{isSinhala ? explanation.explanation.si : explanation.explanation.en}</p>
              </div>

              {/* Key Metrics */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Key Metrics</h3>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Predicted Demand</p>
                    <p className="text-2xl font-bold text-blue-600">{explanation.metrics.predictedDailyDemand.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">units/day</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Current Stock</p>
                    <p className="text-2xl font-bold">{explanation.metrics.currentStock}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Baseline Demand</p>
                    <p className="text-2xl font-bold text-yellow-600">{explanation.metrics.baselineDemand.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">units/day</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Days Until Stockout</p>
                    <p className="text-2xl font-bold text-red-600">{explanation.metrics.daysUntilStockout.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">days</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Recommended</p>
                    <p className="text-2xl font-bold text-green-600">{explanation.metrics.recommendedQuantity}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Reorder Level</p>
                    <p className="text-2xl font-bold text-purple-600">{explanation.metrics.reorderLevel}</p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                </div>
              </div>

              {/* Feature Contributions Chart */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Feature Importance (SHAP Analysis)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={explanation.features.sort((a, b) => b.importance - a.importance)}
                    layout="vertical"
                    margin={{ left: 150 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey={isSinhala ? "nameSi" : "name"} width={140} />
                    <Tooltip 
                      content={({ payload }) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                              <p className="font-semibold">{isSinhala ? data.nameSi : data.name}</p>
                              <p className="text-sm text-gray-600">Value: {data.value}</p>
                              <p className={`font-bold mt-1 ${data.direction === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                                Impact: {data.contribution} ({data.direction})
                              </p>
                              <p className="text-sm text-gray-500">Importance: {(data.importance * 100).toFixed(1)}%</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="impact" 
                      fill="#0ea5e9"
                      radius={[0, 8, 8, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Feature Details Table */}
              <div>
                <h3 className="font-semibold mb-3 text-lg">Detailed Feature Analysis</h3>
                <div className="space-y-2">
                  {explanation.features
                    .sort((a, b) => b.importance - a.importance)
                    .map((feature, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 text-center w-8">
                        <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{isSinhala ? feature.nameSi : feature.name}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            feature.direction === 'increase' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {feature.direction === 'increase' ? '↑' : '↓'} {feature.contribution}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Value: <strong>{feature.value}</strong></span>
                          <span>Impact: <strong>{Math.abs(feature.impact).toFixed(2)}</strong></span>
                          <span>Importance: <strong>{(feature.importance * 100).toFixed(1)}%</strong></span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-24">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              feature.direction === 'increase' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${feature.importance * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Loading explanation...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
