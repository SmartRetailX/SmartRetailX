import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Award, TrendingUp, ShoppingBag, Star, Clock, Tag, Crown, Sparkles, Target, BarChart3, Users, Zap } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

export default function CustomerLoyalty() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [loyaltyData, setLoyaltyData] = useState(null)
  const [rfmData, setRfmData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const CUSTOMER_ID = 101462

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true)
        const [loyaltyRes, rfmRes] = await Promise.all([
          fetch(`http://localhost:8003/loyalty-tiers/customer/${CUSTOMER_ID}`),
          fetch(`http://localhost:8003/segments/rfm/${CUSTOMER_ID}`),
        ])
        if (!loyaltyRes.ok) throw new Error(`Loyalty API error: ${loyaltyRes.status}`)
        if (!rfmRes.ok) throw new Error(`RFM API error: ${rfmRes.status}`)
        const [loyalty, rfm] = await Promise.all([loyaltyRes.json(), rfmRes.json()])
        setLoyaltyData(loyalty)
        setRfmData(rfm)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [CUSTOMER_ID])

  const customer = {
    name: user?.name || "Customer",
    totalPurchases: 12,
    totalSpent: 845.5,
    memberSince: "2024-05-10",
    lastPurchase: "2026-02-28",
  }

  const tierHierarchy = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"]
  const getTierLevel = (name) => tierHierarchy.findIndex((t) => t.toLowerCase() === name?.toLowerCase()) + 1
  const getNextTier = (name) => {
    const idx = tierHierarchy.findIndex((t) => t.toLowerCase() === name?.toLowerCase())
    return idx >= 0 && idx < tierHierarchy.length - 1 ? tierHierarchy[idx + 1] : null
  }
  const getTierIcon = (name) => {
    const n = name?.toLowerCase()
    return n === "diamond" || n === "platinum" ? Crown : Award
  }

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div
            className="w-16 h-16 rounded-full border-4 animate-spin mx-auto"
            style={{ borderColor: "#3B82F6", borderTopColor: "transparent" }}
          />
          <p className="text-gray-500 font-medium">Loading your loyalty profile…</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6 text-center space-y-2">
            <div className="text-4xl">⚠️</div>
            <p className="font-semibold text-red-600">Could not load loyalty data</p>
            <p className="text-sm text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────
  const tierName = loyaltyData?.loyalty_tier_name || "Silver"
  const tierColor = loyaltyData?.tier_color || "#c0c0c0"
  const tierLevel = getTierLevel(tierName)
  const nextTierName = getNextTier(tierName)
  const TierIcon = getTierIcon(tierName)
  const benefitsList = (loyaltyData?.benefits || "").split(",").map((b) => b.trim()).filter(Boolean)
  const preferredCategories = loyaltyData?.preferred_categories || []

  // RFM from API
  const recency = rfmData?.metrics?.recency ?? 0
  const frequency = rfmData?.metrics?.frequency ?? 0
  const monetary = rfmData?.metrics?.monetary ?? 0
  const segment = rfmData?.sub_cluster?.segment || "Unknown"
  const behavior = rfmData?.parent_cluster?.behavior || ""

  // Normalise for chart display (recency: lower=better so invert, monetary scaled)
  const recencyScore = Math.max(0, Math.min(100, Math.round(100 - recency)))   // days since last purchase → invert
  const frequencyScore = Math.max(0, Math.min(100, frequency * 10))             // scale up (1 purchase → 10%)
  const monetaryScore = Math.max(0, Math.min(100, Math.round((monetary / 200) * 100))) // scale to 200 LKR ceiling

  const rfmChartData = [
    { label: "Recency", value: recencyScore, raw: `${recency} days ago`, color: "#a855f7" },
    { label: "Frequency", value: frequencyScore, raw: `${frequency} purchase${frequency !== 1 ? "s" : ""}`, color: "#f97316" },
    { label: "Monetary", value: monetaryScore, raw: `LKR ${monetary.toFixed(2)}`, color: "#22c55e" },
  ]

  const segmentColorMap = {
    Promising: "#3b82f6",
    Champions: "#f59e0b",
    Loyal: "#10b981",
    "At Risk": "#ef4444",
    "Need Attention": "#f97316",
    "Lost": "#6b7280",
  }
  const segmentColor = segmentColorMap[segment] || tierColor

  const summaryCards = [
    {
      title: "Total Purchases",
      value: frequency,
      sub: "all time",
      icon: ShoppingBag,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.1)",
    },
    {
      title: "Total Spent",
      value: `LKR ${monetary.toFixed(2)}`,
      sub: "lifetime value",
      icon: TrendingUp,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.1)",
    },
    {
      title: "Loyalty Tier",
      value: tierName,
      sub: `Level ${tierLevel}`,
      icon: TierIcon,
      color: tierColor,
      bg: `${tierColor}22`,
    },
    {
      title: "Customer Segment",
      value: segment,
      sub: "RFM classification",
      icon: Users,
      color: segmentColor,
      bg: `${segmentColor}22`,
    },
  ]

  return (
    <div className="space-y-6 p-1">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Loyalty</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome back,{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{customer.name}</span>{" "}
            — here's your rewards overview.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-md"
          style={{ background: `linear-gradient(135deg, ${tierColor}cc, ${tierColor})` }}
        >
          <TierIcon className="h-4 w-4" />
          {tierName} Member
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Tier Card ── */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TierIcon className="h-5 w-5" style={{ color: tierColor }} />
              Your Loyalty Tier
            </CardTitle>
            <CardDescription>Current status &amp; benefits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tier badge */}
            <div
              className="rounded-2xl p-6 text-white relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${tierColor}cc 0%, ${tierColor} 100%)` }}
            >
              <div className="absolute -top-6 -right-6 opacity-10">
                <TierIcon className="h-32 w-32" />
              </div>
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Active Tier</p>
              <h2 className="text-4xl font-black">{tierName}</h2>
              <p className="text-sm opacity-75 mt-1">Customer #{loyaltyData?.customer_id}</p>
            </div>

           

            {/* Benefits */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Your Benefits</p>
              <div className="space-y-2">
                {benefitsList.length > 0 ? (
                  benefitsList.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No benefits listed yet.</p>
                )}
              </div>
            </div>

            {/* Preferred Categories */}
            {preferredCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Preferred Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {preferredCategories.map((cat, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${tierColor}bb, ${tierColor})` }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* RFM Segment Banner */}
          <Card className="overflow-hidden">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Customer Segment</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-black"
                      style={{ color: segmentColor }}
                    >
                      {segment}
                    </span>
                   
                  </div>
                  {behavior && (
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">{behavior}</p>
                  )}
                </div>
                <div
                  className="p-3 rounded-2xl"
                  style={{ background: `${segmentColor}18` }}
                >
                  <Users className="h-8 w-8" style={{ color: segmentColor }} />
                </div>
              </div>

              {/* Raw RFM values */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Recency", raw: `${recency}d`, desc: "Days since last purchase", color: "#a855f7" },
                  { label: "Frequency", raw: frequency, desc: "Total purchases", color: "#f97316" },
                  { label: "Monetary", raw: `LKR ${monetary.toFixed(0)}`, desc: "Avg order value", color: "#22c55e" },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 text-center"
                    style={{ background: `${m.color}12` }}
                  >
                    <p className="text-lg font-black" style={{ color: m.color }}>{m.raw}</p>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{m.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RFM Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Behavioural Metrics (RFM)
              </CardTitle>
              <CardDescription>Normalised scores — higher is better</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart
                  data={rfmChartData}
                  barCategoryGap="30%"
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: "currentColor" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "rgba(150,150,150,0.8)" }}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(150,150,150,0.08)", radius: 6 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-sm">
                          <p className="font-semibold">{d.label}</p>
                          <p className="text-gray-500 text-xs">Raw: {d.raw}</p>
                          <p className="font-bold mt-1" style={{ color: d.color }}>Score: {d.value}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    {rfmChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Recency score is inverted — fewer days = higher score
              </p>
            </CardContent>
          </Card>

          
        </div>
      </div>
    </div>
  )
}