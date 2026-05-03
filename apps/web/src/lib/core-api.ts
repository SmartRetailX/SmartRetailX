import type {
  Address,
  AdminCategoriesResponse,
  CartResponse,
  CategoriesResponse,
  OrderListResponse,
  OrderResponse,
  OrderStatus,
  ProductListResponse,
  ProductResponse,
  ProductTranslationResponse,
} from '@/types/store';
import { getPublicBaseUrl } from './base-url';

const rootBaseUrl = getPublicBaseUrl();
const coreBaseUrl = `${rootBaseUrl}/api/core`;

type QueryValue = string | number | boolean | null | undefined;
type PaginatedParams = {
  page?: number;
  limit?: number;
  offset?: number;
};

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${coreBaseUrl}${path}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return rootBaseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

async function request<T>(path: string, init?: RequestInit, query?: Record<string, QueryValue>) {
  const hasBody = init?.body !== undefined && init?.body !== null;

  const response = await fetch(buildUrl(path, query), {
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

function withOffset<TParams extends PaginatedParams>(params: TParams) {
  const page = Number(params.page);
  const limit = Number(params.limit);

  if (Number.isFinite(page) && Number.isFinite(limit) && page > 0 && limit > 0) {
    return {
      ...params,
      page: Math.floor(page),
      limit: Math.floor(limit),
      offset: (Math.floor(page) - 1) * Math.floor(limit),
    };
  }

  return params;
}

export const coreApi = {
  listProducts(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDir?: string;
  }) {
    return request<ProductListResponse>('/products', undefined, withOffset(params));
  },
  getProduct(productId: string) {
    return request<ProductResponse>(`/products/${productId}`);
  },
  listCategories() {
    return request<CategoriesResponse>('/categories');
  },
  getCart() {
    return request<CartResponse>('/cart');
  },
  addToCart(productId: string, quantity = 1) {
    return request<CartResponse>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  },
  updateCartItem(productId: string, quantity: number) {
    return request<CartResponse>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },
  removeFromCart(productId: string) {
    return request<CartResponse>(`/cart/items/${productId}`, {
      method: 'DELETE',
    });
  },
  clearCart() {
    return request<CartResponse>('/cart', {
      method: 'DELETE',
    });
  },
  createOrder(payload: { shippingAddress: Address; billingAddress: Address; notes?: string }) {
    return request<OrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listOrders(params: {
    page?: number;
    limit?: number;
    offset?: number;
    status?: OrderStatus | '';
  }) {
    return request<OrderListResponse>('/orders', undefined, withOffset(params));
  },
  cancelOrder(orderId: string) {
    return request<OrderResponse>(`/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
  listAdminProducts(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }) {
    return request<ProductListResponse>('/admin/products', undefined, withOffset(params));
  },
  listAdminCategories() {
    return request<AdminCategoriesResponse>('/admin/categories');
  },
  translateProductFields(payload: { name?: string; description?: string }) {
    return request<ProductTranslationResponse>('/admin/products/translate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  createCategory(payload: { name: string; nameSi?: string }) {
    return request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateCategory(categoryId: string, payload: { name?: string; nameSi?: string }) {
    return request(`/admin/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteCategory(categoryId: string) {
    return request(`/admin/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },
  createProduct(payload: Record<string, unknown>) {
    return request<ProductResponse>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateProduct(productId: string, payload: Record<string, unknown>) {
    return request<ProductResponse>(`/admin/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteProduct(productId: string) {
    return request<{ success: boolean; message?: string }>(`/admin/products/${productId}`, {
      method: 'DELETE',
    });
  },
  adjustProductStock(
    productId: string,
    payload: { quantityChange?: number; balanceTo?: number; note?: string },
  ) {
    return request<ProductResponse>(`/admin/products/${productId}/stock-adjustments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listAdminOrders(params: {
    page?: number;
    limit?: number;
    offset?: number;
    status?: OrderStatus | '';
    search?: string;
  }) {
    return request<OrderListResponse>('/admin/orders', undefined, withOffset(params));
  },
  updateOrderStatus(orderId: string, status: OrderStatus) {
    return request<OrderResponse>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
