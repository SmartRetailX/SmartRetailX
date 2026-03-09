import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Award, TrendingUp, ShoppingBag, Star, Clock } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LoyaltyData = {
  customer_id: number
  loyalty_tier_id: number
  loyalty_tier_name: string
  tier_color: string
  benefits: string
  preferred_categories: string[]
}

export default function CustomerLoyalty() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Replace with real API URL
  const API_URL = "http://localhost:8003/loyalty-tiers/customer/101462"

  useEffect(() => {
    const fetchLoyalty = async () => {
      try {
        const res = await fetch(API_URL)
        if (!res.ok) throw new Error("Failed to fetch loyalty data")
        const data: LoyaltyData = await res.json()
        setLoyalty(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLoyalty()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!loyalty) return <div>No loyalty data found</div>

  const customerName = user?.name || "Customer"

  const summaryCards = [
    {
      title: t("loyalty.currentTier"),
      value: loyalty.loyalty_tier_name,
      icon: Award,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20"
    }
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("loyalty.title")}</h1>
        <p className="text-gray-500 mt-1">
          {t("loyalty.welcomeMessage", { name: customerName })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Loyalty Tier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t("loyalty.currentTier")}
          </CardTitle>
          <CardDescription>
            {loyalty.benefits}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            className="rounded-lg p-6 text-white mb-4"
            style={{
              background: `linear-gradient(135deg, ${loyalty.tier_color}dd 0%, ${loyalty.tier_color} 100%)`
            }}
          >
            <p className="text-sm opacity-90">{t("loyalty.yourTier")}</p>
            <h2 className="text-3xl font-bold">{loyalty.loyalty_tier_name}</h2>
          </div>

          <div className="space-y-2">
            {loyalty.preferred_categories.map((category, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-yellow-500" />
                {category}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}