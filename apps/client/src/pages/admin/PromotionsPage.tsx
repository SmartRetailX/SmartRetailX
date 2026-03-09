import { useState } from 'react'
import {
  Target,
  Sparkles,
  Users,
  TrendingUp,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  usePromotionProducts,
  useProductCategories,
  useGenerateCampaign,
  usePromotionEngineHealth,
  type CustomerTarget,
  type CampaignSummary,
} from '@/hooks/usePromotionEngine'

export default function PromotionsPage() {
  // Form state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [discountPercent, setDiscountPercent] = useState(10)
  const [maxCustomers, setMaxCustomers] = useState(50)

  // Result state
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null)
  const [targets, setTargets] = useState<CustomerTarget[]>([])

  // API hooks
  const { data: healthData } = usePromotionEngineHealth()
  const { data: categoriesData } = useProductCategories()
  const { data: productsData, isLoading: productsLoading } = usePromotionProducts(
    selectedCategory || undefined
  )
  const generateMutation = useGenerateCampaign()

  const isMLReady = healthData?.models_loaded === true

  const handleGenerate = async () => {
    if (!selectedProduct) return
    try {
      const result = await generateMutation.mutateAsync({
        productId: selectedProduct,
        discountPercent,
        maxCustomers,
      })
      if (result.success) {
        setCampaign(result.campaign)
        setTargets(result.targets)
      }
    } catch (error) {
      console.error('Campaign generation failed:', error)
    }
  }

  const selectedProductInfo = productsData?.products?.find(p => p.id === selectedProduct)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-violet-600" />
            Promotions Engine
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered customer targeting for personalized promotions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            isMLReady
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            <div className={`h-2 w-2 rounded-full ${isMLReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {isMLReady ? 'ML Models Ready' : 'ML Service Loading...'}
          </div>
        </div>
      </div>

      {/* Campaign Builder */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Campaign Builder
            </CardTitle>
            <CardDescription>
              Select a product and configure the promotion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Category</label>
              <div className="relative">
                <select
                  id="category-select"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm appearance-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setSelectedProduct('')
                  }}
                >
                  <option value="">All Categories</option>
                  {categoriesData?.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Product *</label>
              <div className="relative">
                <select
                  id="product-select"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm appearance-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  disabled={productsLoading}
                >
                  <option value="">
                    {productsLoading ? 'Loading products...' : 'Select a product'}
                  </option>
                  {productsData?.products?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} — Rs. {product.price.toLocaleString()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Discount Slider */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Discount: <span className="text-violet-600 font-bold">{discountPercent}%</span>
              </label>
              <input
                id="discount-slider"
                type="range"
                min={5}
                max={50}
                step={5}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Max Customers */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Max Customers: <span className="text-violet-600 font-bold">{maxCustomers}</span>
              </label>
              <input
                id="max-customers-slider"
                type="range"
                min={10}
                max={500}
                step={10}
                value={maxCustomers}
                onChange={(e) => setMaxCustomers(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10</span>
                <span>500</span>
              </div>
            </div>

            {/* Selected Product Info */}
            {selectedProductInfo && (
              <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  {selectedProductInfo.name}
                </p>
                <p className="text-xs text-violet-600 mt-0.5">
                  {selectedProductInfo.category} · Rs. {selectedProductInfo.price.toLocaleString()}
                </p>
                <p className="text-xs text-violet-500 mt-1">
                  Discount: Rs. {(selectedProductInfo.price * discountPercent / 100).toLocaleString()} per unit
                </p>
              </div>
            )}

            {/* Generate Button */}
            <Button
              id="generate-campaign-btn"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
              size="lg"
              disabled={!selectedProduct || generateMutation.isPending || !isMLReady}
              onClick={handleGenerate}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Campaign
                </>
              )}
            </Button>

            {generateMutation.isError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Failed to generate campaign. Make sure the ML service is running.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Summary KPIs */}
          {campaign && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/20">
                      <Users className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Targeted</p>
                      <p className="text-xl font-bold">{campaign.totalTargeted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expected Conversions</p>
                      <p className="text-xl font-bold">{campaign.expectedConversions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Expected Revenue</p>
                      <p className="text-xl font-bold">Rs. {campaign.expectedRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                      <BarChart3 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cost Savings</p>
                      <p className="text-xl font-bold">Rs. {campaign.costSavingsVsBroadcast.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Campaign Info Banner */}
          {campaign && (
            <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{campaign.productName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {campaign.productCategory} · Rs. {campaign.productPrice.toLocaleString()} · {campaign.discountPercent}% off
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Avg. Purchase Probability</p>
                    <p className="text-2xl font-bold text-violet-600">
                      {(campaign.avgPurchaseProbability * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-violet-200 dark:border-violet-700">
                  <div>
                    <p className="text-xs text-gray-500">Expected Profit</p>
                    <p className="text-lg font-bold text-green-600">Rs. {campaign.expectedProfit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Campaign Cost</p>
                    <p className="text-lg font-bold text-orange-600">Rs. {campaign.expectedCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">vs. Broadcast Savings</p>
                    <p className="text-lg font-bold text-emerald-600">Rs. {campaign.costSavingsVsBroadcast.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Customers Table */}
          {targets.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Targeted Customers ({targets.length})
                </CardTitle>
                <CardDescription>
                  Customers most likely to respond to this promotion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" id="targets-table">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-3 font-medium text-gray-500">#</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Customer</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Location</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Segment</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-500">Buy Probability</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-500">CF Score</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-500">Hybrid Score</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targets.map((target, index) => (
                        <tr
                          key={target.customerId}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-gray-400">{index + 1}</td>
                          <td className="py-2.5 px-3 font-medium">{target.customerName}</td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{target.location}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              target.segment === 'frequent_shoppers'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : target.segment === 'regular_shoppers'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : target.segment === 'occasional_shoppers'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              {target.segment.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono font-medium text-violet-600">
                              {(target.purchaseProbability * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {target.cfScore.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono font-medium">
                              {(target.hybridScore * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-xs text-gray-500">{target.targetingMethod}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : !generateMutation.isPending ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                <Target className="h-12 w-12 mb-3 text-gray-300" />
                <h3 className="text-lg font-medium mb-1">No Campaign Generated</h3>
                <p className="text-sm max-w-md">
                  Select a product from the left panel, adjust the discount and target count,
                  then click <strong>"Generate Campaign"</strong> to find the best customers.
                </p>
                <ArrowRight className="h-6 w-6 mt-4 text-violet-400 animate-bounce" />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
