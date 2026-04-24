import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { coreApi } from '@/lib/core-api';
import type { OrderStatus } from '@/types/store';

import { useAuth } from './auth';

export function useCatalogProductsQuery(params: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['catalog-products', params],
    queryFn: () => coreApi.listProducts(params),
  });
}

export function useInfiniteCatalogProductsQuery(params: {
  search?: string;
  category?: string;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  return useInfiniteQuery({
    queryKey: ['catalog-products', params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      coreApi.listProducts({
        ...params,
        page: Number(pageParam),
      }),
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data.pagination;
      return pagination.page < pagination.totalPages ? pagination.page + 1 : undefined;
    },
  });
}

export function useCatalogCategoriesQuery() {
  return useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => coreApi.listCategories(),
  });
}

export function useCartQuery() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => coreApi.getCart(),
    enabled: isAuthenticated,
  });
}

export function useOrdersQuery(params: { status?: OrderStatus | '' }) {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['orders', user?.id, params],
    queryFn: () => coreApi.listOrders(params),
    enabled: isAuthenticated,
  });
}

export function useAdminProductsQuery(params: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-products', params],
    queryFn: () => coreApi.listAdminProducts(params),
    enabled: user?.role === 'admin',
  });
}

export function useAdminCategoriesQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => coreApi.listAdminCategories(),
    enabled: user?.role === 'admin',
  });
}

export function useAdminOrdersQuery(params: {
  status?: OrderStatus | '';
  search?: string;
  page?: number;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => coreApi.listAdminOrders(params),
    enabled: user?.role === 'admin',
  });
}

export function useStoreMutations() {
  const queryClient = useQueryClient();

  const invalidateShopperData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] }),
      queryClient.invalidateQueries({ queryKey: ['cart'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
    ]);
  };

  return {
    addToCart: useMutation({
      mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) =>
        coreApi.addToCart(productId, quantity),
      onSuccess: invalidateShopperData,
    }),
    updateCartItem: useMutation({
      mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
        coreApi.updateCartItem(productId, quantity),
      onSuccess: invalidateShopperData,
    }),
    removeFromCart: useMutation({
      mutationFn: (productId: string) => coreApi.removeFromCart(productId),
      onSuccess: invalidateShopperData,
    }),
    clearCart: useMutation({
      mutationFn: () => coreApi.clearCart(),
      onSuccess: invalidateShopperData,
    }),
    checkout: useMutation({
      mutationFn: coreApi.createOrder,
      onSuccess: invalidateShopperData,
    }),
    cancelOrder: useMutation({
      mutationFn: (orderId: string) => coreApi.cancelOrder(orderId),
      onSuccess: invalidateShopperData,
    }),
    createProduct: useMutation({
      mutationFn: coreApi.createProduct,
      onSuccess: invalidateShopperData,
    }),
    updateProduct: useMutation({
      mutationFn: ({
        productId,
        payload,
      }: {
        productId: string;
        payload: Record<string, unknown>;
      }) => coreApi.updateProduct(productId, payload),
      onSuccess: invalidateShopperData,
    }),
    deleteProduct: useMutation({
      mutationFn: (productId: string) => coreApi.deleteProduct(productId),
      onSuccess: invalidateShopperData,
    }),
    adjustProductStock: useMutation({
      mutationFn: ({
        productId,
        payload,
      }: {
        productId: string;
        payload: Record<string, unknown>;
      }) => coreApi.adjustProductStock(productId, payload),
      onSuccess: invalidateShopperData,
    }),
    createCategory: useMutation({
      mutationFn: coreApi.createCategory,
      onSuccess: invalidateShopperData,
    }),
    updateCategory: useMutation({
      mutationFn: ({
        categoryId,
        payload,
      }: {
        categoryId: string;
        payload: Record<string, unknown>;
      }) => coreApi.updateCategory(categoryId, payload),
      onSuccess: invalidateShopperData,
    }),
    deleteCategory: useMutation({
      mutationFn: (categoryId: string) => coreApi.deleteCategory(categoryId),
      onSuccess: invalidateShopperData,
    }),
    updateOrderStatus: useMutation({
      mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
        coreApi.updateOrderStatus(orderId, status),
      onSuccess: invalidateShopperData,
    }),
  };
}
