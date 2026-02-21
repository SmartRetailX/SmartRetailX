import { OrderService } from '@/services/order.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrderStatus, PaymentStatus } from '@/types/order.type';

import { queryKeys } from './query-keys';

// ---------------------------------------------------------------------------
// Query params type
// ---------------------------------------------------------------------------

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const useOrdersQuery = (params: OrderQueryParams = {}) => {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => OrderService.getOrders(params),
  });
};

export const useOrderQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => OrderService.getOrder(id),
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const useCreateOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof OrderService.createOrder>[0]) =>
      OrderService.createOrder(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
};

export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: OrderStatus; notes?: string }) =>
      OrderService.updateOrderStatus(id, status, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
};

export const useUpdatePaymentStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment_status }: { id: string; payment_status: PaymentStatus }) =>
      OrderService.updatePaymentStatus(id, payment_status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
};

export const useCancelOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => OrderService.cancelOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
};
