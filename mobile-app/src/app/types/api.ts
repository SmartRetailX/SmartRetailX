export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export type Product = {
  productId: string;
  name: string;
  nameSi?: string | null;
  description?: string | null;
  category?: string | null;
  categoryNameSi?: string | null;
  price: number;
  stockQuantity: number;
};

export type ProductListPayload = {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    totalPages: number;
  };
};

export type CartItem = {
  productId: string;
  productName: string;
  productNameSi?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
};

export type Order = {
  orderId: string;
  status: string;
  total: number;
  createdAt: string;
};

export type VoiceMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

export type VoiceChatResponse = {
  sessionId: string;
  responseText: string;
  transcription?: string;
};

export type SessionResponse = {
  session: {
    token: string;
  };
};
