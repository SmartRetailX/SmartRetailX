import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AddToCartDto, RemoveFromCartDto, UpdateCartItemDto } from '@smart-retail-x/dto';

import { CartService } from './cart.service';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @MessagePattern('cart.get')
  async getCart(@Payload() userId: string) {
    return await this.cartService.getCart(userId);
  }

  @MessagePattern('cart.addItem')
  async addItem(@Payload() data: { userId: string; addToCartDto: AddToCartDto }) {
    return await this.cartService.addItem(data.userId, data.addToCartDto);
  }

  @MessagePattern('cart.updateItem')
  async updateItem(@Payload() data: { userId: string; updateCartItemDto: UpdateCartItemDto }) {
    return await this.cartService.updateItem(data.userId, data.updateCartItemDto);
  }

  @MessagePattern('cart.removeItem')
  async removeItem(@Payload() data: { userId: string; removeFromCartDto: RemoveFromCartDto }) {
    return await this.cartService.removeItem(data.userId, data.removeFromCartDto);
  }

  @MessagePattern('cart.clear')
  async clearCart(@Payload() userId: string) {
    await this.cartService.clearCart(userId);
    return { success: true, message: 'Cart cleared successfully' };
  }
}
