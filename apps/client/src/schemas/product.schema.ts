import { z } from 'zod';

export const productApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price: z.number(),
  stock_quantity: z.number(),
  category: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  sku: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const productListApiSchema = z.object({
  products: z.array(productApiSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ProductApiResponse = z.infer<typeof productApiSchema>;
export type ProductListApiResponse = z.infer<typeof productListApiSchema>;

export const createProductFormSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters long'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  stock_quantity: z.number().min(0, 'Stock must be non-negative'),
  category: z.string().optional(),
  image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  sku: z.string().min(3, 'SKU must be at least 3 characters long'),
  is_active: z.boolean(),
});

export type CreateProductFormValues = z.infer<typeof createProductFormSchema>;
