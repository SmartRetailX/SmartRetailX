import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { CartService } from './cart.service';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @MessagePattern({ cmd: 'cart_get' })
  async getCart(data: { userId: string }) {
    return this.cartService.getOrCreateCart(data.userId);
  }

  @MessagePattern({ cmd: 'cart_add' })
  async addToCart(data: { userId: string; productId: string; quantity?: number }) {
    return this.cartService.addToCart(data.userId, data.productId, data.quantity ?? 1);
  }

  @MessagePattern({ cmd: 'cart_update' })
  async updateCartItem(data: { userId: string; productId: string; quantity: number }) {
    return this.cartService.updateCartItem(data.userId, data.productId, data.quantity);
  }

  @MessagePattern({ cmd: 'cart_remove' })
  async removeFromCart(data: { userId: string; productId: string }) {
    return this.cartService.removeFromCart(data.userId, data.productId);
  }

  @MessagePattern({ cmd: 'cart_clear' })
  async clearCart(data: { userId: string }) {
    return this.cartService.clearCart(data.userId);
  }
}
