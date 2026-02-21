import type { CartApiResponse, CartItemApiResponse } from '../schemas/cart.schema';
import type { Cart, CartItem } from '../types/cart.type';
import { mapProductResponse } from './product.mapper';

export function mapCartItemResponse(apiData: CartItemApiResponse): CartItem {
  return {
    id: apiData.id,
    cartId: apiData.cart_id,
    productId: apiData.product_id,
    product: mapProductResponse(apiData.product),
    quantity: apiData.quantity,
    priceAtAddition: apiData.price_at_addition,
    createdAt: new Date(apiData.created_at),
    updatedAt: new Date(apiData.updated_at),
  };
}

export function mapCartResponse(apiData: CartApiResponse): Cart {
  const items = apiData.items.map(mapCartItemResponse);

  const totalPrice = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return {
    id: apiData.id,
    userId: apiData.user_id,
    items,
    createdAt: new Date(apiData.created_at),
    updatedAt: new Date(apiData.updated_at),
    totalPrice,
  };
}
