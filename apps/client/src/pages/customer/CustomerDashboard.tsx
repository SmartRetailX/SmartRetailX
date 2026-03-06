import { useTranslation } from 'react-i18next'
import {
  ShoppingBag,
  CreditCard,
  Tag,
  Star,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Clock,
  Gift,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CustomerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()

  // Static summary cards for customer dashboard
  const summaryCards = [
    {
      title: t('customerDashboard.totalOrders'),
      value: '24',
      change: 12.5,
      trend: 'up' as const,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: t('customerDashboard.totalSpent'),
      value: 'LKR 45,280',
      change: 8.3,
      trend: 'up' as const,
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: t('customerDashboard.loyaltyPoints'),
      value: '1,250',
      change: 15.0,
      trend: 'up' as const,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
    {
      title: t('customerDashboard.activeCoupons'),
      value: '3',
      change: -1,
      trend: 'down' as const,
      icon: Tag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
  ]

  // Recent orders mock data
  const recentOrders = [
    {
      id: 'ORD-2024-001',
      date: '2026-03-01',
      items: 5,
      total: 'LKR 3,450',
      status: 'Delivered',
    },
    {
      id: 'ORD-2024-002',
      date: '2026-02-25',
      items: 3,
      total: 'LKR 1,820',
      status: 'Delivered',
    },
    {
      id: 'ORD-2024-003',
      date: '2026-02-20',
      items: 8,
      total: 'LKR 6,200',
      status: 'Delivered',
    },
    {
      id: 'ORD-2024-004',
      date: '2026-02-14',
      items: 2,
      total: 'LKR 980',
      status: 'Delivered',
    },
  ]

  // Active promotions
  const promotions = [
    {
      id: 1,
      title: t('customerDashboard.weekendSale'),
      description: t('customerDashboard.weekendSaleDesc'),
      discount: '15%',
      validUntil: '2026-03-10',
    },
    {
      id: 2,
      title: t('customerDashboard.loyaltyBonus'),
      description: t('customerDashboard.loyaltyBonusDesc'),
      discount: '2x Points',
      validUntil: '2026-03-15',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('customerDashboard.welcome')}</h1>
        <p className="text-gray-500 mt-1">
          {t('customerDashboard.welcomeMessage', { name: user?.name || 'Customer' })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center text-xs mt-1">
                  {card.trend === 'up' ? (
                    <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span
                    className={
                      card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {Math.abs(card.change).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {t('customerDashboard.vsLastMonth')}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('customerDashboard.recentOrders')}
            </CardTitle>
            <CardDescription>{t('customerDashboard.recentOrdersDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{order.id}</p>
                    <p className="text-xs text-gray-500">
                      {order.date} &middot; {order.items} {t('customerDashboard.items')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{order.total}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Promotions & Offers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {t('customerDashboard.promotions')}
            </CardTitle>
            <CardDescription>{t('customerDashboard.promotionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-100 dark:border-purple-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{promo.title}</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {promo.discount}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {promo.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('customerDashboard.validUntil')}: {promo.validUntil}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('customerDashboard.spendingOverview')}
          </CardTitle>
          <CardDescription>{t('customerDashboard.spendingOverviewDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('customerDashboard.thisMonth')}
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">LKR 8,450</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('customerDashboard.avgPerOrder')}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">LKR 1,887</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('customerDashboard.savedWithCoupons')}
              </p>
              <p className="text-2xl font-bold text-purple-600 mt-1">LKR 2,150</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
