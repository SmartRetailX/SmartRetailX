export type CatalogSearchRaw = {
  productId: string;
  sku: string;
  name: string;
  nameSi: string | null;
  brand: string;
  categoryId: string;
  category: string;
  categoryNameSi: string | null;
  price: number;
  currentStock: number;
  imageUrl: string | null;
  isActive: boolean;
};

export type CatalogSearchMatch = CatalogSearchRaw & {
  tokenHits: number;
  matchedTokens: string[];
  exactHit: boolean;
  prefixHit: boolean;
  phraseHit: boolean;
  matchScore: number;
  modelScore?: number;
  modelQuery?: string;
};

export type CatalogSearchResponse = {
  success: boolean;
  term: string;
  matches: CatalogSearchRaw[];
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderListResponse = {
  success: boolean;
  data?: {
    orders: OrderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
};

export type OrderDetailItem = {
  id: string;
  productId: string;
  productName: string;
  productNameSi: string | null;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  items: OrderDetailItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetailResponse = {
  success: boolean;
  data?: OrderDetail;
  message?: string;
};
