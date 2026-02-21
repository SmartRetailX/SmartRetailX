import { z } from 'zod';

import { productApiSchema } from './product.schema';

export const cartItemApiSchema = z.object({
  id: z.string(),
  cart_id: z.string(),
  product_id: z.string(),
  product: productApiSchema,
  quantity: z.number(),
  price_at_addition: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  created_at: z.string(),
  updated_at: z.string(),
});

export const cartApiSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  items: z.array(cartItemApiSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CartItemApiResponse = z.infer<typeof cartItemApiSchema>;
export type CartApiResponse = z.infer<typeof cartApiSchema>;

export const addToCartFormSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

export const updateCartItemFormSchema = z.object({
  cart_item_id: z.string().uuid(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

export type AddToCartFormValues = z.infer<typeof addToCartFormSchema>;
export type UpdateCartItemFormValues = z.infer<typeof updateCartItemFormSchema>;
