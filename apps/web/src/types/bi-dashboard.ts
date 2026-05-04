export type TrendDirection = 'up' | 'down' | 'stable';

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

export type BiApiSuccessResponse<TData> = {
  success: true;
  data: TData;
};

export type BiApiErrorResponse = {
  success: false;
  error?: string;
  message?: string;
};

export type BiApiResponse<TData> = BiApiSuccessResponse<TData> | BiApiErrorResponse;

export type BiKpiMetric = {
  value: number;
  change: number;
  trend: TrendDirection;
};

export type BiDashboardKpis = {
  totalRevenue: BiKpiMetric;
  totalOrders: BiKpiMetric;
  activeAlerts: BiKpiMetric;
  criticalAlerts?: BiKpiMetric;
  forecastAccuracy?: BiKpiMetric;
  totalProducts?: BiKpiMetric;
  lowStockProducts?: BiKpiMetric;
};

export type BiSalesTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type BiTopProduct = {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
};

export type BiDashboardSummary = {
  kpis: BiDashboardKpis;
  topProducts: BiTopProduct[];
  salesTrend: BiSalesTrendPoint[];
};

export type BiAlertUrgency = 'HIGH' | 'MEDIUM' | 'LOW' | 'high' | 'medium' | 'low';
export type BiAlertStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED' | 'pending' | 'accepted' | 'dismissed';

export type BiAlert = {
  id: string;
  type: string;
  urgency: BiAlertUrgency;
  status: BiAlertStatus;
  productId?: string;
  productName?: string;
  currentStock?: number;
  recommendedQuantity?: number;
  reason?: string;
  confidence?: number;
  createdAt?: string;
};

export type BiAlertsPayload = {
  alerts: BiAlert[];
};

export type BiForecastPoint = {
  date: string;
  predictedSales: number;
  confidenceLower?: number;
  confidenceUpper?: number;
  revenue?: number;
};

export type BiForecastDriver = {
  name: string;
  nameSi?: string;
  impact: number;
  description: string;
  descriptionSi?: string;
};

export type BiForecastResponse = {
  productId: string;
  storeId?: string;
  modelType: string;
  confidence: number;
  generatedAt: string;
  forecasts: BiForecastPoint[];
  drivers: BiForecastDriver[];
};

export type BiForecastFeatureExplanation = {
  name: string;
  nameSi?: string;
  value?: string | number;
  contribution?: number;
  description: string;
  descriptionSi?: string;
};

export type BiForecastExplanation = {
  predictedValue?: number;
  confidence?: number;
  baseValue?: number;
  modelType?: string;
  summary?: string;
  features: BiForecastFeatureExplanation[];
};

export type BiForecastExplanationPayload = {
  explanation: BiForecastExplanation;
};

export type BiRestockMetrics = {
  predictedDailyDemand: number;
  daysUntilStockout: number;
  recommendedQuantity: number;
};

export type BiRestockFeature = {
  name: string;
  direction?: string;
  description: string;
};

export type BiRestockExplanationPayload = {
  explanation: {
    en?: string;
    si?: string;
  };
  metrics: BiRestockMetrics;
  features: BiRestockFeature[];
};
