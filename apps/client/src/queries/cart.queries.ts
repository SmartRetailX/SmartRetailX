import { CartService } from '@/services/cart.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './query-keys';

export const useCartQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.cart.details(),
    queryFn: () => CartService.getCart(),
    ...options,
  });
};

export const useAddToCartMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { product_id: string; quantity: number }) => CartService.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};

export const useUpdateCartItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { cart_item_id: string; quantity: number }) => CartService.updateItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};

export const useRemoveCartItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => CartService.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};

export const useClearCartMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => CartService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};
