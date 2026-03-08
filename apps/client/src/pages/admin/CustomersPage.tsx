import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber } from "@/lib/utils"

interface RFMSegment {
  customer_id: number
  parent_cluster: {
    behavior: string
  }
  sub_cluster: {
    segment: string
  }
  metrics: {
    recency: number
    frequency: number
    monetary: number
  }
}

const SEGMENT_COLORS: Record<string, string> = {
  "Champions": "bg-green-500",
  "Loyal Customers": "bg-blue-500",
  "Potential Loyalists": "bg-cyan-500",
  "Promising": "bg-teal-500",
  "New Customers": "bg-purple-500",
  "Need Attention": "bg-amber-500",
  "About to Sleep": "bg-indigo-500",
  "At Risk": "bg-yellow-500",
  "Cannt Lose": "bg-orange-500",
  "Hibernating": "bg-red-500",
  "Lost": "bg-red-600"
}

export default function CustomersPage() {
  const { t, i18n } = useTranslation()

  const [customers, setCustomers] = useState<RFMSegment[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [segmentFilter, setSegmentFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [minFrequency, setMinFrequency] = useState("")
  const [minMonetary, setMinMonetary] = useState("")

  const isSinhala = i18n.language === "si"

  useEffect(() => {
    fetch("http://localhost:8000/segments/rfm")
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // Segment counts
  const segmentCounts: Record<string, number> = {}

  customers.forEach((c) => {
    const segment = c.sub_cluster?.segment || "Unknown"
    segmentCounts[segment] = (segmentCounts[segment] || 0) + 1
  })

  const rfmSegments = Object.entries(segmentCounts).map(([name, count]) => ({
    name,
    count,
    color: SEGMENT_COLORS[name] || "bg-gray-400"
  }))

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    const segmentMatch =
      segmentFilter === "all" || c.sub_cluster?.segment === segmentFilter

    const searchMatch =
      search === "" || String(c.customer_id).includes(search)

    const frequencyMatch =
      minFrequency === "" || c.metrics.frequency >= Number(minFrequency)

    const monetaryMatch =
      minMonetary === "" || c.metrics.monetary >= Number(minMonetary)

    return segmentMatch && searchMatch && frequencyMatch && monetaryMatch
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("customers.title")}</h1>
        <p className="text-gray-500 mt-1">Customer segmentation and analytics</p>
      </div>

      {/* RFM Segments */}
      <Card>
        <CardHeader>
          <CardTitle>{t("customers.rfmMatrix")}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rfmSegments.map((segment, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className={`h-3 w-full ${segment.color} rounded mb-2`} />
                <p className="font-medium">{segment.name}</p>
                <p className="text-2xl font-bold mt-1">{segment.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">

            <input
              type="text"
              placeholder="Search Customer ID"
              className="border rounded p-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="border rounded p-2"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
            >
              <option value="all">All Segments</option>
              {Object.keys(segmentCounts).map((seg) => (
                <option key={seg} value={seg}>
                  {seg}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Min Frequency"
              className="border rounded p-2"
              value={minFrequency}
              onChange={(e) => setMinFrequency(e.target.value)}
            />

            <input
              type="number"
              placeholder="Min Spending"
              className="border rounded p-2"
              value={minMonetary}
              onChange={(e) => setMinMonetary(e.target.value)}
            />

            <button
              onClick={() => {
                setSegmentFilter("all")
                setSearch("")
                setMinFrequency("")
                setMinMonetary("")
              }}
              className="bg-gray-200 hover:bg-gray-300 rounded px-4 py-2"
            >
              Reset
            </button>

          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t("common.loading")}</div>
          ) : filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Customer</th>
                    <th className="text-right p-3">Recency</th>
                    <th className="text-right p-3">Frequency</th>
                    <th className="text-right p-3">Monetary</th>
                    <th className="text-center p-3">Segment</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                    >
                      <td className="p-3 font-semibold">
                        #{customer.customer_id}
                      </td>

                      <td className="text-right p-3">
                        {formatNumber(customer.metrics?.recency || 0)} days
                      </td>

                      <td className="text-right p-3">
                        {formatNumber(customer.metrics?.frequency || 0)} times
                      </td>

                      <td className="text-right p-3">
                        {formatCurrency(customer.metrics?.monetary || 0)}
                      </td>

                      <td className="text-center p-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {customer.sub_cluster?.segment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t("common.noData")}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}