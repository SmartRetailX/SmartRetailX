import { useTranslation } from 'react-i18next'
import { useCustomers } from '@/hooks/useCustomers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'

const RFM_SEGMENTS = [
  { name: 'Champions', color: 'bg-green-500', count: 0 },
  { name: 'Loyal', color: 'bg-blue-500', count: 0 },
  { name: 'Potential', color: 'bg-cyan-500', count: 0 },
  { name: 'Recent', color: 'bg-purple-500', count: 0 },
  { name: 'At Risk', color: 'bg-yellow-500', count: 0 },
  { name: 'Lost', color: 'bg-red-500', count: 0 },
]

export default function CustomersPage() {
  const { t, i18n } = useTranslation()
  const { data: customersData, isLoading } = useCustomers()
  const isSinhala = i18n.language === 'si'
  
  // Update RFM segments with actual counts from API
  const segmentCounts = customersData?.segmentCounts as Record<string, number> | undefined
  const rfmSegments = segmentCounts ? [
    { name: 'Champions', color: 'bg-green-500', count: segmentCounts['champions'] || 0 },
    { name: 'Loyal', color: 'bg-blue-500', count: segmentCounts['loyal'] || 0 },
    { name: 'Potential Loyalist', color: 'bg-cyan-500', count: segmentCounts['potential_loyalist'] || 0 },
    { name: 'New Customers', color: 'bg-purple-500', count: segmentCounts['new_customers'] || 0 },
    { name: 'At Risk', color: 'bg-yellow-500', count: segmentCounts['at_risk'] || 0 },
    { name: 'Hibernating', color: 'bg-red-500', count: segmentCounts['hibernating'] || 0 },
  ] : RFM_SEGMENTS

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('customers.title')}</h1>
        <p className="text-gray-500 mt-1">Customer segmentation and analytics</p>
      </div>

      {/* RFM Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customers.rfmMatrix')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rfmSegments.map((segment, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className={`h-3 w-full ${segment.color} rounded mb-2`}></div>
                <p className="font-medium">{segment.name}</p>
                <p className="text-2xl font-bold mt-1">{segment.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : customersData?.customers && customersData.customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Customer</th>
                    <th className="text-right p-3">{t('customers.lastPurchase')}</th>
                    <th className="text-right p-3">{t('customers.frequency')}</th>
                    <th className="text-right p-3">{t('customers.totalSpent')}</th>
                    <th className="text-center p-3">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {customersData.customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </td>
                      <td className="text-right p-3">{customer.metrics?.lastPurchase ? new Date(customer.metrics.lastPurchase).toLocaleDateString() : 'N/A'}</td>
                      <td className="text-right p-3">{customer.rfmScore?.frequency || 0}</td>
                      <td className="text-right p-3">{formatCurrency(customer.metrics?.totalSpent || 0)}</td>
                      <td className="text-center p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.segment === 'champions' ? 'bg-green-100 text-green-800' :
                          customer.segment === 'loyal' ? 'bg-blue-100 text-blue-800' :
                          customer.segment === 'potential_loyalist' ? 'bg-cyan-100 text-cyan-800' :
                          customer.segment === 'new_customers' ? 'bg-purple-100 text-purple-800' :
                          customer.segment === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
                          customer.segment === 'hibernating' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.segment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
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
