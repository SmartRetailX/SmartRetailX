export type Pagination = {
  page: number;
  limit: number;
  offset?: number;
  total: number;
  totalPages: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  nameSi: string | null;
  description: string | null;
  descriptionSi: string | null;
  categoryId: string;
  category: string;
  categoryNameSi: string | null;
  price: number;
  currentStock: number;
  brand: string;
  purchaseFrequency: 'high' | 'medium' | 'low';
  imageUrl: string | null;
  isActive: boolean;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdBy: string | null;
  createdAt: string;
  updatedAt?: string;
  stockEntries?: StockEntry[];
};

export type StockEntry = {
  id: string;
  quantityChange: number;
  balanceAfter: number;
  type: 'initial' | 'adjustment' | 'rebalance' | 'sale' | 'cancellation';
  note: string | null;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  nameSi: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductListResponse = {
  success: boolean;
  data: {
    products: Product[];
    pagination: Pagination;
  };
  message?: string;
};

export type ProductResponse = {
  success: boolean;
  data?: Product;
  message?: string;
};

export type CategoriesResponse = {
  success: boolean;
  data: {
    categories: string[];
  };
  message?: string;
};

export type AdminCategoriesResponse = {
  success: boolean;
  data: {
    categories: Category[];
  };
  message?: string;
};

export type ProductTranslationResponse = {
  success: boolean;
  data: {
    nameSi: string | null;
    descriptionSi: string | null;
  };
  message?: string;
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productNameSi: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currentStock: number;
};

export type Cart = {
  id: string;
  userId: string;
  status: 'active' | 'abandoned' | 'converted';
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
};

export type CartResponse = {
  success: boolean;
  data?: Cart;
  message?: string;
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productNameSi: string | null;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Address = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  shippingAddress: Address | null;
  billingAddress: Address | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderListItem = Omit<Order, 'items' | 'shippingAddress' | 'billingAddress' | 'notes'>;

export type OrderResponse = {
  success: boolean;
  data?: Order;
  message?: string;
};

export type OrderListResponse = {
  success: boolean;
  data: {
    orders: OrderListItem[];
    pagination: Pagination;
  };
  message?: string;
};
