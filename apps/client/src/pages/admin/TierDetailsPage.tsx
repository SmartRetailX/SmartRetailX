import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  Tag,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BackendCustomerProfile {
  customer_id: number;
  rfm: {
    parent_cluster: {
      behavior: string;
    };
    sub_cluster: {
      segment: string;
    };
    metrics: {
      recency: number;
      frequency: number;
      monetary: number;
    };
  };
  category_preference?: {
    preferred_category: string;
    ratio: number;
    top_categories: string[];
    category_contributions: Record<string, number>;
  };
}

interface TierDetail {
  id: string;
  tier_name: string;
  tier_description: string;
  color_code: string;
  behavioral_traits: string[];
  customer_count: number;
  total_revenue: number;
  avg_behavioral_score: number;
  avg_churn_risk: number;
}

// Distinct color palette for categories
const CATEGORY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

function getTierColor(behavior: string) {
  if (behavior.toLowerCase().includes("high")) return "#3B82F6";
  if (behavior.toLowerCase().includes("engaged")) return "#10B981";
  if (behavior.toLowerCase().includes("potential")) return "#F59E0B";
  if (behavior.toLowerCase().includes("inactive")) return "#6B7280";
  if (behavior.toLowerCase().includes("dormant")) return "#EF4444";
  return "#8B5CF6";
}

function behavioralScore(recency: number, frequency: number) {
  return frequency * 20 + Math.max(0, 100 - recency);
}

function churnRisk(recency: number) {
  return Math.min(recency / 365, 1);
}

// ── Category analytics helpers ────────────────────────────────────────────────

/** Aggregate total contribution share per category across all customers. */
function buildCategoryContributions(customers: BackendCustomerProfile[]) {
  const totals: Record<string, number> = {};
  let grandTotal = 0;

  customers.forEach((c) => {
    if (!c.category_preference) return;
    Object.entries(c.category_preference.category_contributions).forEach(
      ([cat, ratio]) => {
        const revenue = c.rfm.metrics.monetary * ratio;
        totals[cat] = (totals[cat] || 0) + revenue;
        grandTotal += revenue;
      }
    );
  });

  return Object.entries(totals)
    .map(([name, revenue]) => ({
      name,
      revenue: Math.round(revenue),
      share: grandTotal > 0 ? (revenue / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Count how many customers prefer each category. */
function buildPreferredCategoryCounts(customers: BackendCustomerProfile[]) {
  const counts: Record<string, number> = {};
  customers.forEach((c) => {
    const pref = c.category_preference?.preferred_category;
    if (pref) counts[pref] = (counts[pref] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Average affinity ratio per category (how loyal buyers are to it). */
function buildCategoryAffinity(customers: BackendCustomerProfile[]) {
  const sums: Record<string, { total: number; n: number }> = {};
  customers.forEach((c) => {
    if (!c.category_preference) return;
    Object.entries(c.category_preference.category_contributions).forEach(
      ([cat, ratio]) => {
        if (!sums[cat]) sums[cat] = { total: 0, n: 0 };
        sums[cat].total += ratio;
        sums[cat].n += 1;
      }
    );
  });
  return Object.entries(sums)
    .map(([name, { total, n }]) => ({
      name,
      affinity: parseFloat(((total / n) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.affinity - a.affinity);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TierDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tier, setTier] = useState<TierDetail | null>(null);
  const [customers, setCustomers] = useState<BackendCustomerProfile[]>([]);

  useEffect(() => {
    if (id) loadTier(id);
  }, [id]);

  async function loadTier(tierKey: string) {
    try {
      const res = await fetch("http://localhost:8003/segments/profiles");
      const data: BackendCustomerProfile[] = await res.json();

      const tierCustomers = data.filter(
        (c) => c.rfm.parent_cluster.behavior === tierKey
      );

      if (tierCustomers.length === 0) return;

      let totalRevenue = 0;
      let totalScore = 0;
      let totalChurn = 0;
      const subClusters = new Set<string>();

      tierCustomers.forEach((c) => {
        totalRevenue += c.rfm.metrics.monetary;
        totalScore += behavioralScore(
          c.rfm.metrics.recency,
          c.rfm.metrics.frequency
        );
        totalChurn += churnRisk(c.rfm.metrics.recency);
        subClusters.add(c.rfm.sub_cluster.segment);
      });

      setCustomers(tierCustomers);

      setTier({
        id: tierKey,
        tier_name: tierKey,
        tier_description: `Customers classified as "${tierKey}" based on RFM and behavioral clustering.`,
        color_code: getTierColor(tierKey),
        behavioral_traits: Array.from(subClusters),
        customer_count: tierCustomers.length,
        total_revenue: totalRevenue,
        avg_behavioral_score: totalScore / tierCustomers.length,
        avg_churn_risk: totalChurn / tierCustomers.length,
      });
    } catch (err) {
      console.error("Failed to load tier details", err);
    }
  }

  if (!tier) {
    return (
      <div className="space-y-6 text-center text-gray-500 py-12">
        Loading tier details...
      </div>
    );
  }

  const behavioralProfile = [
    {
      metric: "Recency",
      value:
        100 -
        customers.reduce((s, c) => s + c.rfm.metrics.recency, 0) /
          customers.length,
    },
    {
      metric: "Frequency",
      value:
        (customers.reduce((s, c) => s + c.rfm.metrics.frequency, 0) /
          customers.length) *
        20,
    },
    {
      metric: "Monetary",
      value:
        customers.reduce((s, c) => s + c.rfm.metrics.monetary, 0) /
        customers.length /
        50,
    },
  ];

  const revenueData = customers.map((c, i) => ({
    index: i + 1,
    revenue: c.rfm.metrics.monetary,
  }));

  const subClusterCounts: Record<string, number> = customers.reduce(
    (acc, c) => {
      const segment = c.rfm.sub_cluster.segment;
      acc[segment] = (acc[segment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Category analytics
  const categoryContributions = buildCategoryContributions(customers);
  const preferredCategoryCounts = buildPreferredCategoryCounts(customers);
  const categoryAffinity = buildCategoryAffinity(customers);
  const hasCategoryData = customers.some((c) => c.category_preference);

  // Top category for summary badge
  const topCategory = categoryContributions[0]?.name ?? "—";
  const topCategoryRevenue = categoryContributions[0]?.revenue ?? 0;

  return (
    <div className="space-y-6">

      {/* Tier Header */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl text-white font-bold text-2xl flex items-center justify-center"
          style={{ backgroundColor: tier.color_code }}
        >
          {tier.tier_name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{tier.tier_name}</h1>
          <p className="text-gray-500">{tier.tier_description}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Customers" value={tier.customer_count} />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${tier.total_revenue.toLocaleString()}`} />
        <StatCard icon={TrendingUp} label="Behavior Score" value={tier.avg_behavioral_score.toFixed(1)} />
        <StatCard icon={AlertTriangle} label="Churn Risk" value={`${(tier.avg_churn_risk * 100).toFixed(1)}%`} />
      </div>

      {/* Sub-Clusters */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Cluster Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-sm">
            {tier.behavioral_traits.map((segment) => (
              <span
                key={segment}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                {segment} ({subClusterCounts[segment] || 0})
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Behavioral Profile">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={behavioralProfile}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis />
              <Radar
                dataKey="value"
                stroke={tier.color_code}
                fill={tier.color_code}
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke={tier.color_code} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── CATEGORY SEPARATION SECTION ─────────────────────────────────────── */}
      {hasCategoryData && (
        <div className="space-y-6">
          {/* Section heading */}
          <div className="flex items-center gap-2 pt-2">
            <ShoppingBag className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold">Category Analysis</h2>
          </div>

          {/* Category summary stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={Tag}
              label="Top Category"
              value={topCategory}
            />
            <StatCard
              icon={DollarSign}
              label="Top Category Revenue"
              value={`$${topCategoryRevenue.toLocaleString()}`}
            />
            <StatCard
              icon={ShoppingBag}
              label="Distinct Categories"
              value={categoryContributions.length}
            />
          </div>

          {/* Revenue by Category (bar) + Preferred Category distribution (pie) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Revenue by Category">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryContributions} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {categoryContributions.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Preferred Category Distribution">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={preferredCategoryCounts}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {preferredCategoryCounts.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "Customers"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Category Affinity (avg ratio) bar chart */}
          <ChartCard title="Average Category Affinity (% of spend per buyer)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryAffinity} margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Avg Affinity"]} />
                <Bar dataKey="affinity" radius={[4, 4, 0, 0]}>
                  {categoryAffinity.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Category breakdown table per customer */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 px-3">Customer ID</th>
                      <th className="py-2 px-3">Preferred Category</th>
                      <th className="py-2 px-3">Affinity Ratio</th>
                      <th className="py-2 px-3">Top Categories</th>
                      <th className="py-2 px-3">Category Contributions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter((c) => c.category_preference)
                      .map((c) => {
                        const pref = c.category_preference!;
                        return (
                          <tr
                            key={c.customer_id}
                            className="border-b last:border-none hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="py-2 px-3 font-medium">{c.customer_id}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
                                {pref.preferred_category}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${pref.ratio * 100}%` }}
                                  />
                                </div>
                                <span>{(pref.ratio * 100).toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1">
                                {pref.top_categories.map((cat) => (
                                  <span
                                    key={cat}
                                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-1 min-w-[160px]">
                                {Object.entries(pref.category_contributions).map(
                                  ([cat, ratio], i) => (
                                    <div key={cat} className="flex items-center gap-2 text-xs">
                                      <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{
                                          backgroundColor:
                                            CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                        }}
                                      />
                                      <span className="text-gray-600 dark:text-gray-400 w-24 truncate">
                                        {cat}
                                      </span>
                                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div
                                          className="h-full rounded-full"
                                          style={{
                                            width: `${ratio * 100}%`,
                                            backgroundColor:
                                              CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                                          }}
                                        />
                                      </div>
                                      <span className="text-gray-500">
                                        {(ratio * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* ── END CATEGORY SECTION ─────────────────────────────────────────────── */}

    </div>
  );
}

/* ================= SMALL UI ================= */

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border">
      <div className="flex gap-3 mb-2">
        <Icon className="w-5 h-5 text-blue-500" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}