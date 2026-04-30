import { api } from './client';
import type { ApiResponse, Cart, Order, ProductListPayload, VoiceChatResponse } from '../types/api';

export async function getProducts(search?: string) {
  const { data } = await api.get<ApiResponse<ProductListPayload>>('/core/products', {
    params: { search, page: 1, limit: 20 },
  });
  return data;
}

export async function getCart() {
  const { data } = await api.get<ApiResponse<Cart>>('/core/cart');
  return data;
}

export async function addCartItem(productId: string, quantity = 1) {
  const { data } = await api.post<ApiResponse<Cart>>('/core/cart/items', { productId, quantity });
  return data;
}

export async function updateCartItem(productId: string, quantity: number) {
  const { data } = await api.patch<ApiResponse<Cart>>(`/core/cart/items/${productId}`, { quantity });
  return data;
}

export async function removeCartItem(productId: string) {
  const { data } = await api.delete<ApiResponse<Cart>>(`/core/cart/items/${productId}`);
  return data;
}

export async function createOrder() {
  const { data } = await api.post<ApiResponse<{ order: Order }>>('/core/orders');
  return data;
}

export async function getOrders() {
  const { data } = await api.get<ApiResponse<{ orders: Order[] }>>('/core/orders', {
    params: { page: 1, limit: 20 },
  });
  return data;
}

export async function voiceText(text: string) {
  const { data } = await api.post<VoiceChatResponse>('/v1/voice/chat/text', { text, language: 'si-LK' });
  return data;
}

export async function voiceAudio(uri: string) {
  const form = new FormData();
  form.append('language', 'si-LK');
  form.append('audio', {
    uri,
    type: 'audio/m4a',
    name: `voice-${Date.now()}.m4a`,
  } as unknown as Blob);

  const { data } = await api.post<VoiceChatResponse>('/v1/voice/chat', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return data;
}
