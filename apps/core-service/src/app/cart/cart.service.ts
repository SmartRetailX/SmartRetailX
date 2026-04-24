import { Injectable, Logger } from '@nestjs/common';
import { CartStatus } from '@prisma/client';
import { PrismaService } from '@smart-retail-x/database';

// Types
export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productNameSi: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currentStock: number;
};

export type Cart = {
  id: string;
  userId: string;
  status: 'active' | 'abandoned' | 'converted';
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
};

export type CartResponse = {
  success: boolean;
  data?: Cart;
  message?: string;
};

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateCart(userId: string): Promise<CartResponse> {
    try {
      let cart = await this.prisma.cart.findFirst({
        where: { userId, status: CartStatus.active },
        orderBy: { createdAt: 'desc' },
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId, status: CartStatus.active },
        });
      }

      return { success: true, data: await this.buildCartResponse(cart) };
    } catch (error) {
      this.logger.error(`Failed to get/create cart: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to get cart' };
    }
  }

  async addToCart(userId: string, productId: string, quantity = 1): Promise<CartResponse> {
    try {
      const cartResponse = await this.getOrCreateCart(userId);
      if (!cartResponse.success || !cartResponse.data) return cartResponse;

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, price: true, stockQuantity: true },
      });

      if (!product) return { success: false, message: 'Product not found' };
      if (product.stockQuantity < quantity) return { success: false, message: 'Insufficient stock' };

      const cartId = cartResponse.data.id;
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_productId: { cartId, productId } },
        select: { quantity: true },
      });

      if (existing) {
        await this.prisma.cartItem.update({
          where: { cartId_productId: { cartId, productId } },
          data: { quantity: existing.quantity + quantity, unitPrice: product.price },
        });
      } else {
        await this.prisma.cartItem.create({
          data: { cartId, productId, quantity, unitPrice: product.price },
        });
      }

      return this.getOrCreateCart(userId);
    } catch (error) {
      this.logger.error(`Failed to add to cart: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to add to cart' };
    }
  }

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<CartResponse> {
    try {
      const cartResponse = await this.getOrCreateCart(userId);
      if (!cartResponse.success || !cartResponse.data) return cartResponse;

      const cartId = cartResponse.data.id;

      if (quantity <= 0) {
        await this.prisma.cartItem.deleteMany({ where: { cartId, productId } });
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: { stockQuantity: true },
        });

        if (!product) return { success: false, message: 'Product not found' };
        if (product.stockQuantity < quantity) return { success: false, message: 'Insufficient stock' };

        await this.prisma.cartItem.update({
          where: { cartId_productId: { cartId, productId } },
          data: { quantity },
        });
      }

      return this.getOrCreateCart(userId);
    } catch (error) {
      this.logger.error(`Failed to update cart item: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to update cart' };
    }
  }

  async removeFromCart(userId: string, productId: string): Promise<CartResponse> {
    return this.updateCartItem(userId, productId, 0);
  }

  async clearCart(userId: string): Promise<CartResponse> {
    try {
      const cartResponse = await this.getOrCreateCart(userId);
      if (!cartResponse.success || !cartResponse.data) return cartResponse;

      await this.prisma.cartItem.deleteMany({ where: { cartId: cartResponse.data.id } });
      return this.getOrCreateCart(userId);
    } catch (error) {
      this.logger.error(`Failed to clear cart: ${(error as Error).message}`);
      return { success: false, message: (error as Error).message || 'Failed to clear cart' };
    }
  }

  private async buildCartResponse(cartRow: {
    id: string;
    userId: string;
    status: CartStatus;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Cart> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId: cartRow.id },
      orderBy: { createdAt: 'asc' },
      include: {
        product: { select: { name: true, nameSi: true, sku: true, stockQuantity: true } },
      },
    });

    const items: CartItem[] = cartItems.map((ci) => ({
      id: ci.id,
      productId: ci.productId,
      productName: ci.product.name,
      productNameSi: ci.product.nameSi,
      sku: ci.product.sku,
      quantity: ci.quantity,
      unitPrice: Number(ci.unitPrice),
      totalPrice: Number(ci.unitPrice) * ci.quantity,
      currentStock: ci.product.stockQuantity,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cartRow.id,
      userId: cartRow.userId,
      status: cartRow.status as Cart['status'],
      items,
      itemCount,
      subtotal,
      createdAt: cartRow.createdAt.toISOString(),
      updatedAt: cartRow.updatedAt.toISOString(),
    };
  }
}
