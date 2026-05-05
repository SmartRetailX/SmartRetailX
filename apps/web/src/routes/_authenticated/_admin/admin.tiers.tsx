import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight, DollarSign, Layers, TrendingUp, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface Tier {
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
  if (behavior.includes('high-value')) return '#3B82F6';
  if (behavior.includes('engaged')) return '#10B981';
  if (behavior.includes('potential')) return '#F59E0B';
  if (behavior.includes('inactive')) return '#6B7280';
  if (behavior.includes('dormant')) return '#EF4444';
  return '#8B5CF6';
}

function calculateBehavioralScore(recency: number, frequency: number) {
  const recencyScore = Math.max(0, 100 - recency);
  const frequencyScore = frequency * 10;

  return recencyScore * 0.6 + frequencyScore * 0.4;
}

function calculateChurnRisk(recency: number) {
  return Math.min(recency / 365, 1);
}

export const Route = createFileRoute('/_authenticated/_admin/admin/tiers')({
  component: RouteComponent,
});

function RouteComponent() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const navigate = Route.useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await Promise.all([
        fetch('http://localhost:8003/segments/rfm', { method: 'POST' }),
        fetch('http://localhost:8003/segments/category', { method: 'POST' }),
      ]);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadTiers();
  }, []);

  async function loadTiers() {
    try {
      const response = await fetch('http://localhost:8003/segments/profiles');
      const customers: BackendCustomerProfile[] = await response.json();

      const tierMap: Record<string, Tier> = {};

      customers.forEach((customer) => {
        const tierKey = customer.rfm.parent_cluster.behavior;

        if (!tierMap[tierKey]) {
          tierMap[tierKey] = {
            id: tierKey,
            tier_name: tierKey,
            tier_description: `Customers classified as "${tierKey}" based on RFM analysis.`,
            color_code: getTierColor(tierKey),
            behavioral_traits: [],
            customer_count: 0,
            total_revenue: 0,
            avg_behavioral_score: 0,
            avg_churn_risk: 0,
          };
        }

        const tier = tierMap[tierKey];

        tier.customer_count += 1;
        tier.total_revenue += customer.rfm.metrics.monetary;

        tier.avg_behavioral_score += calculateBehavioralScore(
          customer.rfm.metrics.recency,
          customer.rfm.metrics.frequency,
        );

        tier.avg_churn_risk += calculateChurnRisk(customer.rfm.metrics.recency);

        tier.behavioral_traits.push(customer.rfm.sub_cluster.segment);
      });

      const finalTiers: Tier[] = Object.values(tierMap).map((tier) => ({
        ...tier,
        avg_behavioral_score: tier.avg_behavioral_score / tier.customer_count,
        avg_churn_risk: tier.avg_churn_risk / tier.customer_count,
        behavioral_traits: Array.from(new Set(tier.behavioral_traits)),
      }));

      setTiers(finalTiers);
    } catch (error) {
      console.error('Error loading tiers:', error);
    }
  }

  const getRiskColor = (risk: number) => {
    if (risk < 0.25) return 'text-green-600';
    if (risk < 0.5) return 'text-yellow-600';
    if (risk < 0.75) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Tier Overview</h1>
          <p className="text-gray-500 mt-1">
            Tier-centric segmentation derived from RFM sub-clusters
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 active:scale-95 transition-all duration-150 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
              Generate Now
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={Layers} label="Active Tiers" value={tiers.length} />

        <SummaryCard
          icon={Users}
          label="Total Customers"
          value={tiers.reduce((s, t) => s + t.customer_count, 0).toLocaleString()}
        />

        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={`Rs. ${tiers.reduce((s, t) => s + t.total_revenue, 0).toLocaleString()}`}
        />

        <SummaryCard
          icon={TrendingUp}
          label="Avg Score"
          value={
            tiers.length
              ? (tiers.reduce((s, t) => s + t.avg_behavioral_score, 0) / tiers.length).toFixed(1)
              : '0.0'
          }
        />
      </div>

      {/* Tier List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Tiers</CardTitle>
        </CardHeader>

        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <AlertTriangle className="mx-auto w-10 h-10 mb-3" />
              No tiers available
            </div>
          ) : (
            <div className="space-y-4">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  onClick={() =>
                    navigate({
                      to: '/admin/tier-details',
                      search: { id: tier.id },
                    })
                  }
                  className="flex justify-between border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex gap-4 flex-1">
                    <div
                      className="w-10 h-10 rounded-lg text-white font-bold flex items-center justify-center"
                      style={{ backgroundColor: tier.color_code }}
                    >
                      {tier.tier_name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{tier.tier_name}</h3>

                      <p className="text-sm text-gray-500 mb-3">{tier.tier_description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <Stat label="Customers" value={tier.customer_count} />
                        <Stat label="Revenue" value={`Rs. ${tier.total_revenue.toFixed(2)}`} />
                        <Stat label="Behavior Score" value={tier.avg_behavioral_score.toFixed(1)} />
                        <Stat
                          label="Churn Risk"
                          value={`${(tier.avg_churn_risk * 100).toFixed(1)}%`}
                          className={getRiskColor(tier.avg_churn_risk)}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {tier.behavioral_traits.map((segment) => (
                          <span
                            key={segment}
                            className="px-2 py-1 bg-gray-100 text-xs rounded-full"
                          >
                            {segment}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-500" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, className = '' }: any) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-semibold ${className}`}>{value}</p>
    </div>
  );
}
