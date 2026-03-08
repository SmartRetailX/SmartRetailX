import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
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
      const res = await fetch("http://localhost:8000/segments/profiles");
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

  return (
    <div className="space-y-6">

      {/* Back Button */}
      <button
        onClick={() => navigate("/tiers")}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tiers
      </button>

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

      {/* Customer Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers in This Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3">Customer ID</th>
                  <th className="py-2 px-3">Sub-Cluster</th>
                  <th className="py-2 px-3">Recency</th>
                  <th className="py-2 px-3">Frequency</th>
                  <th className="py-2 px-3">Monetary</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer_id} className="border-b last:border-none hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-2 px-3 font-medium">{c.customer_id}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                        {c.rfm.sub_cluster.segment}
                      </span>
                    </td>
                    <td className="py-2 px-3">{c.rfm.metrics.recency}</td>
                    <td className="py-2 px-3">{c.rfm.metrics.frequency}</td>
                    <td className="py-2 px-3">${c.rfm.metrics.monetary.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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