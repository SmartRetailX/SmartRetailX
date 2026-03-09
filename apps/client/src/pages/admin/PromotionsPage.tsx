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
  BarChart3,
  History,
  ChevronRight,
  X,
  FlaskConical,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  usePromotionProducts,
  useProductCategories,
  useGenerateCampaign,
  usePromotionEngineHealth,
  useCampaignHistory,
  useCampaignDetail,
  useCompareAB,
  useProductBundles,
  type CustomerTarget,
  type CampaignSummary,
  type ABTestResult,
} from '@/hooks/usePromotionEngine'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PromotionsPage() {
  // Form state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [discountPercent, setDiscountPercent] = useState(10)
  const [maxCustomers, setMaxCustomers] = useState(50)

  // Result state
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null)
  const [targets, setTargets] = useState<CustomerTarget[]>([])

  // Campaign history detail drawer
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null)

  // A/B test state
  const [abProduct, setAbProduct] = useState('')
  const [abPersonalizedDiscount, setAbPersonalizedDiscount] = useState(10)
  const [abBroadcastDiscount, setAbBroadcastDiscount] = useState(15)
  const [abMaxCustomers, setAbMaxCustomers] = useState(100)
  const [abResult, setAbResult] = useState<ABTestResult | null>(null)

  // API hooks
  const { data: healthData } = usePromotionEngineHealth()
  const isMLReady = healthData?.models_loaded === true
  const { data: categoriesData } = useProductCategories(isMLReady)
  const { data: productsData, isLoading: productsLoading } = usePromotionProducts(
    selectedCategory || undefined,
    isMLReady
  )
  const generateMutation = useGenerateCampaign()
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useCampaignHistory()
  const { data: campaignDetail, isLoading: detailLoading } = useCampaignDetail(selectedCampaignId)
  const { data: allProductsData } = usePromotionProducts(undefined, isMLReady)
  const compareMutation = useCompareAB()
  const { data: bundlesData, isFetching: bundlesFetching } = useProductBundles(
    selectedProduct || null
  )

  const handleCompare = async () => {
    if (!abProduct) return
    try {
      const result = await compareMutation.mutateAsync({
        productId: abProduct,
        personalizedDiscount: abPersonalizedDiscount,
        broadcastDiscount: abBroadcastDiscount,
        maxCustomers: abMaxCustomers,
      })
      if (result.success) {
        setAbResult(result)
      }
    } catch (error) {
      console.error('Comparison failed:', error)
    }
  }

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
        setTargets([...result.targets].sort((a, b) => b.purchaseProbability - a.purchaseProbability))
        refetchHistory()
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

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Campaign Builder
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            Campaign History
            {historyData && historyData.total > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium">
                {historyData.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="abtest" className="flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4" />
            A/B Test
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Campaign Builder ── */}
        <TabsContent value="builder" className="mt-6">
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

              {/* Suggested Bundles card */}
              {selectedProduct && (bundlesFetching || (bundlesData?.bundles && bundlesData.bundles.length > 0)) && (
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span>🛒</span>
                      Frequently Bought Together
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Market basket analysis from purchase history — consider bundling these to boost basket size
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bundlesFetching ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analysing co-purchase patterns...
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {bundlesData!.bundles.map((b) => (
                          <div
                            key={b.productId}
                            className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800"
                          >
                            <div className="mt-0.5 flex-shrink-0 h-8 w-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-200 text-sm font-bold">
                              {b.support.toFixed(0)}%
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight truncate">{b.productName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{b.category} · Rs. {b.price.toLocaleString()}</p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                {b.coPurchaseCount} shared buyers · {b.support.toFixed(1)}% support
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!bundlesFetching && bundlesData?.bundles && bundlesData.bundles.length > 0 && (
                      <p className="mt-3 text-xs text-gray-400 italic">
                        💡 Tip: Use these in a bundle campaign — e.g. &quot;{bundlesData.productName} + {bundlesData.bundles[0]?.productName}&quot; at a combined discount to increase order value.
                      </p>
                    )}
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
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
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
        </TabsContent>

        {/* ── Tab 2: Campaign History ── */}
        <TabsContent value="history" className="mt-6">
          <div className="space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading campaign history...
              </div>
            ) : !historyData?.campaigns?.length ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                  <History className="h-12 w-12 mb-3 text-gray-300" />
                  <h3 className="text-lg font-medium mb-1">No Campaigns Yet</h3>
                  <p className="text-sm max-w-md">
                    Generate your first campaign in the <strong>Campaign Builder</strong> tab — it will be saved here automatically.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {/* History Table */}
                <div className={`${selectedCampaignId ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-violet-500" />
                        Past Campaigns ({historyData.total})
                      </CardTitle>
                      <CardDescription>Click a row to inspect the targeted customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-3 font-medium text-gray-500">Product</th>
                              <th className="text-left py-3 px-3 font-medium text-gray-500">Category</th>
                              <th className="text-right py-3 px-3 font-medium text-gray-500">Discount</th>
                              <th className="text-right py-3 px-3 font-medium text-gray-500">Targeted</th>
                              <th className="text-right py-3 px-3 font-medium text-gray-500">Avg Prob</th>
                              <th className="text-right py-3 px-3 font-medium text-gray-500">Exp. Revenue</th>
                              <th className="text-right py-3 px-3 font-medium text-gray-500">Exp. Profit</th>
                              <th className="text-left py-3 px-3 font-medium text-gray-500">Generated</th>
                              <th className="py-3 px-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.campaigns.map((c) => (
                              <tr
                                key={c.id}
                                onClick={() => setSelectedCampaignId(prev => prev === c.id ? null : c.id)}
                                className={`border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                                  selectedCampaignId === c.id
                                    ? 'bg-violet-50 dark:bg-violet-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-medium max-w-[160px] truncate">{c.productName}</td>
                                <td className="py-2.5 px-3 text-gray-500 text-xs">{c.productCategory}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-violet-600">{c.discountPercent}%</td>
                                <td className="py-2.5 px-3 text-right font-mono">{c.totalTargeted}</td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {(c.avgPurchaseProbability * 100).toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-600">
                                  Rs. {c.expectedRevenue.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-green-600">
                                  Rs. {c.expectedProfit.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-gray-400">
                                  {new Date(c.createdAt).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </td>
                                <td className="py-2.5 px-3 text-gray-400">
                                  <ChevronRight className={`h-4 w-4 transition-transform ${selectedCampaignId === c.id ? 'rotate-90' : ''}`} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detail Panel */}
                {selectedCampaignId && (
                  <div className="lg:col-span-1">
                    <Card className="sticky top-4">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Campaign #{selectedCampaignId}</CardTitle>
                          <button
                            onClick={() => setSelectedCampaignId(null)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {campaignDetail && (
                          <p className="text-sm text-gray-500 mt-1">
                            {campaignDetail.productName} · {campaignDetail.discountPercent}% off
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {detailLoading ? (
                          <div className="flex items-center justify-center py-8 text-gray-400">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Loading...
                          </div>
                        ) : campaignDetail ? (
                          <div className="space-y-4">
                            {/* Mini KPIs */}
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Targeted', value: campaignDetail.totalTargeted, className: 'text-violet-600' },
                                { label: 'Conversions', value: campaignDetail.expectedConversions, className: 'text-green-600' },
                                { label: 'Revenue', value: `Rs. ${campaignDetail.expectedRevenue.toLocaleString()}`, className: 'text-blue-600' },
                                { label: 'Profit', value: `Rs. ${campaignDetail.expectedProfit.toLocaleString()}`, className: 'text-emerald-600' },
                              ].map(({ label, value, className }) => (
                                <div key={label} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                  <p className="text-xs text-gray-500">{label}</p>
                                  <p className={`text-sm font-bold ${className}`}>{value}</p>
                                </div>
                              ))}
                            </div>
                            {/* Targets list */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">
                                Targeted Customers ({campaignDetail.targets?.length ?? 0})
                              </p>
                              <div className="space-y-1 max-h-72 overflow-y-auto">
                                {(campaignDetail.targets ?? []).map((t: CustomerTarget, i: number) => (
                                  <div
                                    key={t.customerId}
                                    className="flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    <span className="text-gray-400 w-5">{i + 1}</span>
                                    <span className="flex-1 font-medium truncate">{t.customerName}</span>
                                    <span className="font-mono text-violet-600 ml-2">
                                      {(t.purchaseProbability * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        {/* ── Tab 3: A/B Test Simulation ── */}
        <TabsContent value="abtest" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Config Panel */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-violet-500" />
                  Test Configuration
                </CardTitle>
                <CardDescription>
                  Compare ML-targeted personalization vs broadcasting to all customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Product *</label>
                  <div className="relative">
                    <select
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm appearance-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      value={abProduct}
                      onChange={(e) => setAbProduct(e.target.value)}
                    >
                      <option value="">Select a product</option>
                      {allProductsData?.products?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — Rs. {p.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Personalized Discount: <span className="text-violet-600 font-bold">{abPersonalizedDiscount}%</span>
                  </label>
                  <input type="range" min={5} max={50} step={5}
                    value={abPersonalizedDiscount}
                    onChange={(e) => setAbPersonalizedDiscount(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5%</span><span>50%</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Broadcast Discount: <span className="text-orange-500 font-bold">{abBroadcastDiscount}%</span>
                  </label>
                  <input type="range" min={5} max={50} step={5}
                    value={abBroadcastDiscount}
                    onChange={(e) => setAbBroadcastDiscount(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5%</span><span>50%</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Personalized Targets: <span className="text-violet-600 font-bold">{abMaxCustomers}</span>
                  </label>
                  <input type="range" min={10} max={500} step={10}
                    value={abMaxCustomers}
                    onChange={(e) => setAbMaxCustomers(Number(e.target.value))}
                    className="w-full accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>10</span><span>500</span></div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 space-y-1.5">
                  <p className="font-semibold">How it works</p>
                  <p>🎯 <strong>Personalized:</strong> ML pipeline targets the top {abMaxCustomers} highest-probability customers with a {abPersonalizedDiscount}% discount.</p>
                  <p>📢 <strong>Broadcast:</strong> Discount sent to all customers. Conversion estimated using the <em>same ML model</em> averaged across the full population — a fair, apples-to-apples comparison.</p>
                  <p>📦 Broadcast cost = discount given to <em>every recipient</em> (not just converters), which is the real cost of indiscriminate campaigns.</p>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                  size="lg"
                  disabled={!abProduct || compareMutation.isPending || !isMLReady}
                  onClick={handleCompare}
                >
                  {compareMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running Analysis...</>
                  ) : (
                    <><FlaskConical className="mr-2 h-4 w-4" />Run A/B Comparison</>
                  )}
                </Button>

                {compareMutation.isError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Comparison failed. Make sure the ML service is running.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Panel */}
            <div className="lg:col-span-2 space-y-5">
              {compareMutation.isPending ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-violet-500" />
                    <p className="font-medium">Running ML pipeline...</p>
                    <p className="text-sm mt-1 text-gray-400">Scoring all customers and computing comparison metrics</p>
                  </CardContent>
                </Card>
              ) : !abResult ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                    <FlaskConical className="h-12 w-12 mb-3 text-gray-300" />
                    <h3 className="text-lg font-medium mb-1">No Comparison Yet</h3>
                    <p className="text-sm max-w-md">
                      Select a product and click <strong>"Run A/B Comparison"</strong> to see
                      how ML-personalized targeting compares to broadcasting to all customers.
                    </p>
                    <ArrowRight className="h-6 w-6 mt-4 text-violet-400 animate-bounce" />
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Winner Banner — conversion efficiency is the primary research metric */}
                  {(() => {
                    const multiplier = 1 + abResult.comparison.convRateLift / 100
                    const personalizedWins = abResult.comparison.convRateLift > 0
                    return (
                      <div className={`p-4 rounded-xl border-2 ${
                        personalizedWins
                          ? 'bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-700'
                          : 'bg-orange-50 border-orange-400 dark:bg-orange-900/20 dark:border-orange-700'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              {abResult.productName} · {abResult.productCategory} · Rs. {abResult.productPrice.toLocaleString()}
                            </p>
                            <h3 className={`text-xl font-bold mt-1 ${
                              personalizedWins ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
                            }`}>
                              {personalizedWins
                                ? `🎯 Personalized wins: ${multiplier.toFixed(1)}× better conversion rate`
                                : `📢 Broadcast leads conversion by ${(1 / multiplier).toFixed(1)}×`}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Personalized hit rate{' '}
                              <span className="font-semibold text-violet-700">{abResult.personalized.conversionRate.toFixed(1)}%</span>
                              {' '}vs broadcast{' '}
                              <span className="font-semibold text-gray-600">{abResult.broadcast.conversionRate.toFixed(2)}%</span>
                              {' · '}
                              <span className="font-semibold text-violet-600">Rs. {abResult.comparison.revenuePerCustomerPersonalized.toFixed(0)}</span> vs{' '}
                              <span className="font-semibold text-gray-600">Rs. {abResult.comparison.revenuePerCustomerBroadcast.toFixed(1)}</span>
                              {' '}revenue per customer
                            </p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <div>
                              <p className="text-xs text-gray-500">Rev/Customer — Personalized</p>
                              <p className="text-2xl font-bold text-violet-600">Rs. {abResult.comparison.revenuePerCustomerPersonalized.toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rev/Customer — Broadcast</p>
                              <p className="text-lg font-bold text-gray-500">Rs. {abResult.comparison.revenuePerCustomerBroadcast.toFixed(1)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-sm text-violet-800 dark:text-violet-200 space-y-1">
                    <p className="font-semibold text-xs uppercase tracking-wide text-violet-600">📌 Insight</p>
                    <p>
                      Broadcast reaches all {abResult.totalCustomers.toLocaleString()} customers but only <strong>{abResult.broadcast.conversionRate.toFixed(2)}%</strong> are likely to buy — the promotional discount is spread thin across low-intent contacts.
                      Personalized ML targeting concentrates the same offer on <strong>{abResult.personalized.customersReached}</strong> customers who have a <strong>{abResult.personalized.conversionRate.toFixed(1)}%</strong> average purchase probability.
                      Every rupee of discount budget is working on a <em>likely buyer</em> — this is why the ROI is higher even when absolute revenue is lower.
                    </p>
                  </div>

                  {/* Side-by-side metric cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-violet-600" />
                          🎯 Personalized
                          <span className="ml-auto text-xs font-normal bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200 px-2 py-0.5 rounded-full">
                            {abResult.personalized.discountPercent}% off
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {([
                          ['Customers Reached', abResult.personalized.customersReached.toLocaleString(), false],
                          ['Conversion Rate', `${abResult.personalized.conversionRate.toFixed(1)}%`, true],
                          ['Revenue per Customer', `Rs. ${abResult.comparison.revenuePerCustomerPersonalized.toFixed(1)}`, true],
                          ['Conversions', abResult.personalized.conversions.toLocaleString(), false],
                          ['Revenue', `Rs. ${abResult.personalized.revenue.toLocaleString()}`, false],
                          ['Discount Cost', `Rs. ${abResult.personalized.cost.toLocaleString()}`, false],
                          ['Profit', `Rs. ${abResult.personalized.profit.toLocaleString()}`, false],
                          ['ROI', `${abResult.personalized.roi.toFixed(1)}%`, false],
                        ] as [string, string, boolean][]).map(([label, value, highlight]) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-gray-500">{label}</span>
                            <span className={`font-semibold ${highlight ? 'text-violet-700 dark:text-violet-300' : ''}`}>{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          📢 Broadcast
                          <span className="ml-auto text-xs font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {abResult.broadcast.discountPercent}% off
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {([
                          ['Customers Reached', abResult.broadcast.customersReached.toLocaleString()],
                          ['Conversion Rate', `${abResult.broadcast.conversionRate.toFixed(2)}%`],
                          ['Revenue per Customer', `Rs. ${abResult.comparison.revenuePerCustomerBroadcast.toFixed(1)}`],
                          ['Conversions', abResult.broadcast.conversions.toLocaleString()],
                          ['Revenue', `Rs. ${abResult.broadcast.revenue.toLocaleString()}`],
                          ['Discount Cost', `Rs. ${abResult.broadcast.cost.toLocaleString()}`],
                          ['Profit', `Rs. ${abResult.broadcast.profit.toLocaleString()}`],
                          ['ROI', `${abResult.broadcast.roi.toFixed(1)}%`],
                        ] as [string, string][]).map(([label, value]) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bar charts: ROI + Conversion Rate (efficiency charts) + Financial */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-violet-500" />
                          Conversion Rate (%)
                        </CardTitle>
                        <CardDescription className="text-xs">Share of targeted customers who buy — personalized wins decisively</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={[
                              { metric: 'Conversion Rate', Personalized: abResult.personalized.conversionRate, Broadcast: abResult.broadcast.conversionRate },
                            ]}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                            <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 10 }} width={40} tickFormatter={(v) => `${v}%`} />
                            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, undefined]} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Personalized" fill="#7c3aed" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#7c3aed', formatter: (v: number) => `${v.toFixed(1)}%` }} />
                            <Bar dataKey="Broadcast" fill="#94a3b8" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#94a3b8', formatter: (v: number) => `${v.toFixed(2)}%` }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-violet-500" />
                          Revenue &amp; Profit
                        </CardTitle>
                        <CardDescription className="text-xs">Absolute scale — broadcast may lead due to larger reach</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={[
                              { metric: 'Revenue', Personalized: abResult.personalized.revenue, Broadcast: abResult.broadcast.revenue },
                              { metric: 'Profit', Personalized: abResult.personalized.profit, Broadcast: abResult.broadcast.profit },
                              { metric: 'Disc. Cost', Personalized: abResult.personalized.cost, Broadcast: abResult.broadcast.cost },
                            ]}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                            <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                            <YAxis
                              tickFormatter={(v) => Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}K` : String(v)}
                              tick={{ fontSize: 10 }}
                              width={40}
                            />
                            <Tooltip formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, undefined]} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Personalized" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Broadcast" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 3 key research KPI cards */}
                  {(() => {
                    const convMultiplier = (1 + abResult.comparison.convRateLift / 100).toFixed(1)
                    const revMultiplier = abResult.comparison.revenueEfficiency.toFixed(1)
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="border-0 bg-violet-50 dark:bg-violet-900/20">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Conversion Efficiency</p>
                            <p className="text-2xl font-bold text-violet-600">{convMultiplier}×</p>
                            <p className="text-xs text-gray-400 mt-1">
                              more likely to buy than broadcast ({abResult.personalized.conversionRate.toFixed(1)}% vs {abResult.broadcast.conversionRate.toFixed(2)}%)
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 bg-green-50 dark:bg-green-900/20">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Revenue per Customer</p>
                            <p className="text-2xl font-bold text-green-600">{revMultiplier}×</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Rs. {abResult.comparison.revenuePerCustomerPersonalized.toFixed(0)} vs Rs. {abResult.comparison.revenuePerCustomerBroadcast.toFixed(1)} per customer reached
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="border-0 bg-blue-50 dark:bg-blue-900/20">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Targeting Focus</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {abResult.comparison.customerEfficiency.toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {abResult.personalized.customersReached} of {abResult.totalCustomers.toLocaleString()} customers — precision over spray
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          </div>
        </TabsContent>      </Tabs>
    </div>
  )
}

