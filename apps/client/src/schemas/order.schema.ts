import { z } from 'zod';

import { productApiSchema } from './product.schema';

export const orderStatusEnum = z.enum([
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

export const paymentStatusEnum = z.enum(['pending', 'paid', 'failed', 'refunded']);

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(1, 'Zip code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone is required'),
});

export const orderItemApiSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  product_id: z.string(),
  product: productApiSchema,
  quantity: z.number(),
  price_at_purchase: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  created_at: z.string(),
});

export const orderApiSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  user_id: z.string(),
  total_amount: z.union([z.number(), z.string()]).transform((val) => Number(val)),
  status: orderStatusEnum,
  payment_status: paymentStatusEnum,
  shipping_address: shippingAddressSchema,
  notes: z.string().nullable().optional(),
  items: z.array(orderItemApiSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export const orderListApiSchema = z.object({
  orders: z.array(orderApiSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type OrderApiResponse = z.infer<typeof orderApiSchema>;
export type OrderListApiResponse = z.infer<typeof orderListApiSchema>;
export type ShippingAddressFormValues = z.infer<typeof shippingAddressSchema>;

export const createOrderFormSchema = z.object({
  shipping_address: shippingAddressSchema,
  notes: z.string().optional(),
});
export type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;
