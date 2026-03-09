import { useState, useEffect } from "react";
import { Plus, Award, Pencil, Trash2, X, ChevronDown  } from "lucide-react";

import { 
  LoyaltyTier,  
  CUSTOMER_SEGMENT_OPTIONS,
  SUB_CLUSTER_OPTIONS,
  CATEGORY_OPTIONS, 
} from "@/lib/types";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_URL = "http://localhost:8003/loyalty-tiers";

interface TierFormProps {
  tier?: LoyaltyTier | null;
  onSubmit: (data: Partial<LoyaltyTier>) => void; // <- Pass back the saved tier
  onClose: () => void;
}

function TierForm({ tier, onSubmit, onClose }: TierFormProps) {
  const [formData, setFormData] = useState({
    tier_name: "",
    tier_color: "#3B82F6",
    benefits: "",
    customer_segments: [] as string[],
    sub_clusters: [] as string[],
    preferred_categories: [] as string[],
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (tier) {
      setFormData({
        tier_name: tier.tier_name,
        tier_color: tier.tier_color,
        benefits: tier.benefits,
        customer_segments: tier.customer_segments || [],
        sub_clusters: tier.sub_clusters || [],
        preferred_categories: tier.preferred_categories || [],
      });
    }
  }, [tier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData); // just pass data to parent
    onClose(); // close modal
  };

  const toggleSegment = (segment: string) => {
    setFormData((prev) => ({
      ...prev,
      customer_segments: prev.customer_segments.includes(segment)
        ? prev.customer_segments.filter((s) => s !== segment)
        : [...prev.customer_segments, segment],
    }));
  };

  const toggleCluster = (cluster: string) => {
    setFormData((prev) => ({
      ...prev,
      sub_clusters: prev.sub_clusters.includes(cluster)
        ? prev.sub_clusters.filter((c) => c !== cluster)
        : [...prev.sub_clusters, cluster],
    }));
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      preferred_categories: prev.preferred_categories.includes(category)
        ? prev.preferred_categories.filter((c) => c !== category)
        : [...prev.preferred_categories, category],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {tier ? "Edit Loyalty Tier" : "Create New Loyalty Tier"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tier Name & Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tier Name
              </label>
              <input
                type="text"
                value={formData.tier_name}
                onChange={(e) =>
                  setFormData({ ...formData, tier_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="e.g., Gold Tier"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tier Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.tier_color}
                  onChange={(e) =>
                    setFormData({ ...formData, tier_color: e.target.value })
                  }
                  className="h-10 w-20 rounded-lg cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={formData.tier_color}
                  onChange={(e) =>
                    setFormData({ ...formData, tier_color: e.target.value })
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Benefits
            </label>
            <textarea
              value={formData.benefits}
              onChange={(e) =>
                setFormData({ ...formData, benefits: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
              placeholder="Describe the benefits of this tier..."
            />
          </div>

          {/* Customer Segments */}
          <DropdownSelector
            label="Customer Segments"
            options={CUSTOMER_SEGMENT_OPTIONS}
            selected={formData.customer_segments}
            toggle={toggleSegment}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            keyName="segments"
          />

          {/* Sub Clusters */}
          <DropdownSelector
            label="Sub Clusters"
            options={SUB_CLUSTER_OPTIONS}
            selected={formData.sub_clusters}
            toggle={toggleCluster}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            keyName="clusters"
          />

          {/* Preferred Categories */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Preferred Categories
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.preferred_categories.includes(category)
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md"
            >
              {tier ? "Update Tier" : "Create Tier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DropdownProps {
  label: string;
  options: string[];
  selected: string[];
  toggle: (val: string) => void;
  openDropdown: string | null;
  setOpenDropdown: (val: string | null) => void;
  keyName: string;
}
function DropdownSelector({
  label,
  options,
  selected,
  toggle,
  openDropdown,
  setOpenDropdown,
  keyName,
}: DropdownProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-3">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === keyName ? null : keyName)
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <span className="text-gray-700">
            {selected.length > 0
              ? `${selected.length} selected`
              : `Select ${label.toLowerCase()}...`}
          </span>
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform ${openDropdown === keyName ? "rotate-180" : ""}`}
          />
        </button>

        {openDropdown === keyName && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-2 ${selected.includes(opt) ? "bg-blue-50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => {}}
                  className="rounded"
                />
                {opt}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((opt) => (
            <span
              key={opt}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
            >
              {opt}
              <button
                type="button"
                onClick={() => toggle(opt)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}


interface TierCardProps {
  tier: LoyaltyTier;
  onEdit: (tier: LoyaltyTier) => void;
  onDelete: (id: string) => void;
}

function TierCard({ tier, onEdit, onDelete }: TierCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="h-2" style={{ backgroundColor: tier.tier_color }} />
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className="min-w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: tier.tier_color }}
            >
              {tier.tier_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {tier.tier_name}
              </h3>
              <p className="text-sm text-gray-500">
                {tier.customer_segments.length > 0
                  ? tier.customer_segments.join(", ")
                  : "No segments"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(tier)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit tier"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => onDelete(tier.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete tier"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Benefits
            </p>
            <p className="text-sm text-gray-700">{tier.benefits}</p>
          </div>

          {tier.sub_clusters && tier.sub_clusters.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Sub Clusters
              </p>
              <div className="flex flex-wrap gap-2">
                {tier.sub_clusters.map((cluster, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {cluster}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tier.preferred_categories &&
            tier.preferred_categories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Preferred Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {tier.preferred_categories.map((category, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs rounded-full text-white"
                      style={{ backgroundColor: tier.tier_color }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function LoyaltyPage() {
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [tierToDelete, setTierToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/`);
      const data = await response.json();
      console.log(data);
      setTiers(data);
    } catch (error) {
      console.error("Failed to fetch tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<LoyaltyTier>) => {
    try {
      const response = await fetch(`${API_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create tier");

      await fetchTiers();
      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert("Failed to create tier");
    }
  };

  const handleUpdate = async (data: Partial<LoyaltyTier>) => {
    if (!editingTier) return;

    try {
      const response = await fetch(`${API_URL}/${editingTier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update tier");

      await fetchTiers();
      setEditingTier(null);
      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert("Failed to update tier");
    }
  };

  const confirmDelete = async () => {
    if (!tierToDelete) return;

    try {
      const response = await fetch(`${API_URL}/${tierToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      await fetchTiers();
      setTierToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete tier");
    }
  };

  const handleEdit = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTier(null);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loyalty Tiers</h1>
          <p className="text-gray-500 mt-1">
            Create and manage customer loyalty tiers
          </p>
        </div>

        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tier
        </Button>
      </div>

      {/* Tier List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tiers</CardTitle>
        </CardHeader>

        <CardContent>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading tiers...
            </div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="mx-auto w-10 h-10 mb-3 text-gray-400" />
              <p>No loyalty tiers yet</p>
              <Button
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Create Your First Tier
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  onEdit={handleEdit}
                  onDelete={() => setTierToDelete(tier.id)}
                />
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <TierForm
          tier={editingTier}
          onSubmit={editingTier ? handleUpdate : handleCreate}
          onClose={handleCloseForm}
        />
      )}

      {/* Delete Modal */}
      {tierToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-3">
              Delete Loyalty Tier
            </h3>

            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this tier?
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setTierToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}