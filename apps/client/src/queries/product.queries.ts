import type { CreateProductFormValues } from '@/schemas/product.schema';
import { ProductService } from '@/services/product.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './query-keys';

// ---------------------------------------------------------------------------
// Query params type
// ---------------------------------------------------------------------------

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const useProductsQuery = (params: ProductQueryParams = {}) => {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => ProductService.getProducts(params),
  });
};

export const useProductQuery = (id: string) => {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => ProductService.getProduct(id),
    enabled: !!id,
  });
};

// ---------------------------------------------------------------------------
// Mutations (admin-only)
// ---------------------------------------------------------------------------

export const useCreateProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductFormValues) => ProductService.createProduct(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};

export const useUpdateProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductFormValues> }) =>
      ProductService.updateProduct(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
    },
  });
};

export const useDeleteProductMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ProductService.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
};
