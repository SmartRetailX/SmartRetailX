import { create } from 'zustand';

import type { Cart } from '../types/api';

type CartState = {
  cart: Cart | null;
  setCart: (cart: Cart | null) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  setCart: (cart) => set({ cart }),
  clear: () => set({ cart: null }),
}));
