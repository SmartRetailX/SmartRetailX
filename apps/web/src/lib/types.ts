export interface LoyaltyTier {
  id: string;
  tier_name: string;
  tier_color: string;
  benefits: string;
  customer_segments: string[];
  sub_clusters: string[];
  preferred_categories: string[];
}

export const CUSTOMER_SEGMENT_OPTIONS = [
  'Recent, moderately engaged buyers',
  'Inactive or dormant buyers',
  'Occasional or low-value buyers',
  'Dormant or lost buyers',
  'Low engagement buyers',
  'Recently engaged, high-value buyers',
];

export const SUB_CLUSTER_OPTIONS = [
  'Hibernating',
  'At Risk',
  'Cannt Lose',
  'About to Sleep',
  'Need Attention',
  'Promising',
  'New Customers',
  'Potential Loyalists',
  'Champions',
];

export const CATEGORY_OPTIONS = [
  'Electronics',
  'Clothing',
  'Books',
  'Home & Garden',
  'Sports',
  'Beauty',
  'Toys',
  'Food & Grocery',
];
