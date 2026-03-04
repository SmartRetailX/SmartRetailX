import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, HelpCircle, Download, Maximize2 } from 'lucide-react'
import { useForecast, useForecastExplanation } from '@/hooks/useForecasts'
import { useProducts } from '@/hooks/useInventory'
import { useStores } from '@/hooks/useStores'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts'

export default function ForecastingPage() {
  const { t, i18n } = useTranslation()
  const isSinhala = i18n.language === 'si'
  const [productId, setProductId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [showXAIModal, setShowXAIModal] = useState(false)

  const { data: productsData, isLoading: loadingProducts } = useProducts({})
  const { data: stores, isLoading: loadingStores } = useStores({})
  const { data: forecastData, isLoading, refetch } = useForecast({ productId, storeId, horizon: 30 })
  const { data: explanation } = useForecastExplanation(productId, storeId)
  
  const handleGenerateForecast = () => {
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('forecasting.title')}</h1>
          <p className="text-gray-500 mt-1">AI-powered sales predictions</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {loadingProducts ? (
                    <SelectItem value="loading" disabled>Loading products...</SelectItem>
                  ) : productsData?.data && productsData.data.length > 0 ? (
                    productsData.data.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.id})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No products available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Store</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {loadingStores ? (
                    <SelectItem value="loading" disabled>Loading stores...</SelectItem>
                  ) : stores && stores.length > 0 ? (
                    stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.id})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No stores available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleGenerateForecast}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Forecast
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : forecastData ? (
        <>
          {/* Forecast Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{forecastData.modelType}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">{t('forecasting.confidence')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(forecastData.confidence * 100).toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Horizon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{forecastData.forecasts.length} days</div>
              </CardContent>
            </Card>
          </div>

          {/* Forecast Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('forecasting.forecast')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowXAIModal(true)}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  {t('forecasting.explain')}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={forecastData.forecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="confidenceUpper" 
                    stroke="#0ea5e9" 
                    fill="#0ea5e9"
                    fillOpacity={0.1}
                    name="Upper Bound"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="confidenceLower" 
                    stroke="#0ea5e9" 
                    fill="#0ea5e9"
                    fillOpacity={0.1}
                    name="Lower Bound"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predictedSales" 
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    fill='#00000000'
                    name="Predicted Sales"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* XAI Modal */}
          <Dialog open={showXAIModal} onOpenChange={setShowXAIModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  {t('xai.title')} - AI Explanation
                </DialogTitle>
                <DialogDescription>
                  Understanding how the AI model makes predictions using SHAP values
                </DialogDescription>
              </DialogHeader>
              
              {explanation ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Predicted Value</p>
                      <p className="text-3xl font-bold text-blue-600">{explanation.predictedValue.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Base Value</p>
                      <p className="text-3xl font-bold">{explanation.baseValue.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Impact</p>
                      <p className="text-3xl font-bold text-green-600">
                        {(explanation.predictedValue - explanation.baseValue).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* SHAP Feature Contributions Chart */}
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">Feature Contributions (SHAP Values)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={explanation.features.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip 
                          content={({ payload }) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload
                              return (
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                              <p className="font-semibold">{isSinhala ? data.nameSi : data.name}</p>
                              <p className="text-sm text-gray-600">{isSinhala ? data.descriptionSi : data.description}</p>
                                  <p className={`font-bold mt-1 ${data.contribution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Impact: {data.contribution > 0 ? '+' : ''}{data.contribution.toFixed(3)}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar 
                          dataKey="contribution" 
                          fill="#0ea5e9"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Feature Details */}
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">Detailed Feature Analysis</h3>
                    <div className="space-y-2">
                      {explanation.features
                        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
                        .map((feature, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <p className="font-semibold">{isSinhala ? feature.nameSi : feature.name}</p>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{isSinhala ? feature.descriptionSi : feature.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-2xl font-bold ${feature.contribution > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {feature.contribution > 0 ? '+' : ''}{feature.contribution.toFixed(3)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {((Math.abs(feature.contribution) / Math.abs(explanation.predictedValue - explanation.baseValue)) * 100).toFixed(1)}% impact
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Export Button */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export as PDF
                    </Button>
                    <Button variant="outline">
                      <Maximize2 className="mr-2 h-4 w-4" />
                      Full Screen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Loading explanation data...
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Key Drivers */}
          <Card>
            <CardHeader>
              <CardTitle>{t('forecasting.drivers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {forecastData.drivers.map((driver, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{isSinhala ? driver.nameSi : driver.name}</p>
                      <p className="text-sm text-gray-600">{isSinhala ? driver.descriptionSi : driver.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{(driver.impact * 100).toFixed(0)}%</p>
                      <p className="text-xs text-gray-500">Impact</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Enter product and store IDs to generate forecast
          </CardContent>
        </Card>
      )}
    </div>
  )
}
