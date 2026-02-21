import { processApiResponse } from '../lib/mapper';
import { mapCartResponse } from '../mappers/cart.mapper';
import {
  cartApiSchema,
  type AddToCartFormValues,
  type UpdateCartItemFormValues,
} from '../schemas/cart.schema';
import type { Cart } from '../types/cart.type';
import { apiClient } from './api-client';

export const CartService = {
  /**
   * Fetch the current user's cart
   */
  async getCart(): Promise<Cart> {
    return processApiResponse(apiClient.get('/cart'), cartApiSchema, mapCartResponse);
  },

  /**
   * Add a product to the cart
   */
  async addItem(data: AddToCartFormValues): Promise<Cart> {
    return processApiResponse(apiClient.post('/cart/items', data), cartApiSchema, mapCartResponse);
  },

  /**
   * Update the quantity of a cart item
   */
  async updateItem({ cart_item_id, quantity }: UpdateCartItemFormValues): Promise<Cart> {
    return processApiResponse(
      apiClient.patch(`/cart/items/${cart_item_id}`, { quantity }),
      cartApiSchema,
      mapCartResponse,
    );
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(cart_item_id: string): Promise<Cart> {
    return processApiResponse(
      apiClient.delete(`/cart/items/${cart_item_id}`),
      cartApiSchema,
      mapCartResponse,
    );
  },

  /**
   * Clear the entire cart
   */
  async clearCart(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete('/cart');
    return response.data;
  },
};
