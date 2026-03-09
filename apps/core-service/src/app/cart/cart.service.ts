import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { Pool } from 'pg';

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
export class CartService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CartService.name);
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.databaseUrl,
      min: this.configService.databasePoolMin,
      max: this.configService.databasePoolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    });

    this.pool.on('error', (error) => {
      this.logger.error(`Cart pool error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Cart service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async getOrCreateCart(userId: string): Promise<CartResponse> {
    try {
      // Try to get existing active cart
      let cartResult = await this.pool.query<{
        id: string;
        user_id: string;
        status: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, user_id, status, created_at, updated_at
         FROM public.carts
         WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId],
      );

      let cartId: string;

      if (cartResult.rows.length === 0) {
        // Create new cart
        const newCart = await this.pool.query<{ id: string }>(
          `INSERT INTO public.carts (user_id, status)
           VALUES ($1, 'active')
           RETURNING id`,
          [userId],
        );
        cartId = newCart.rows[0].id;
        cartResult = await this.pool.query(
          `SELECT id, user_id, status, created_at, updated_at
           FROM public.carts WHERE id = $1`,
          [cartId],
        );
      } else {
        cartId = cartResult.rows[0].id;
      }

      const cart = await this.buildCartResponse(cartResult.rows[0]);
      return { success: true, data: cart };
    } catch (error) {
      this.logger.error(`Failed to get/create cart: ${error.message}`);
      return { success: false, message: error.message || 'Failed to get cart' };
    }
  }

  async addToCart(userId: string, productId: string, quantity = 1): Promise<CartResponse> {
    try {
      const cartResponse = await this.getOrCreateCart(userId);
      if (!cartResponse.success || !cartResponse.data) {
        return cartResponse;
      }

      const cartId = cartResponse.data.id;

      // Get product details and validate stock
      const productResult = await this.pool.query<{
        id: string;
        price: number;
        stock_quantity: number;
      }>(
        `SELECT id, price, COALESCE(stock_quantity, 0) as stock_quantity
         FROM public.products WHERE id = $1`,
        [productId],
      );

      if (productResult.rows.length === 0) {
        return { success: false, message: 'Product not found' };
      }

      const product = productResult.rows[0];
      if (product.stock_quantity < quantity) {
        return { success: false, message: 'Insufficient stock' };
      }

      // Upsert cart item
      await this.pool.query(
        `INSERT INTO public.cart_items (cart_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (cart_id, product_id)
         DO UPDATE SET
           quantity = cart_items.quantity + EXCLUDED.quantity,
           unit_price = EXCLUDED.unit_price,
           updated_at = NOW()`,
        [cartId, productId, quantity, product.price],
      );

      // Return updated cart
      return this.getOrCreateCart(userId);
    } catch (error) {
      this.logger.error(`Failed to add to cart: ${error.message}`);
      return { success: false, message: error.message || 'Failed to add to cart' };
    }
  }

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<CartResponse> {
    try {
      const cartResponse = await this.getOrCreateCart(userId);
      if (!cartResponse.success || !cartResponse.data) {
        return cartResponse;
      }

      const cartId = cartResponse.data.id;

      if (quantity <= 0) {
        // Remove item
        await this.pool.query(
          `DELETE FROM public.cart_items WHERE cart_id = $1 AND product_id = $2`,
          [cartId, productId],
        );
      } else {
        // Validate stock
        const productResult = await this.pool.query<{ stock_quantity: number }>(
          `SELECT COALESCE(stock_quantity, 0) as stock_quantity FROM public.products WHERE id = $1`,
          [productId],
        );

        if (productResult.rows.length === 0) {
          return { success: false, message: 'Product not found' };
        }

        if (productResult.rows[0].stock_quantity < quantity) {
          return { success: false, message: 'Insufficient stock' };
        }

        // Update quantity
        await this.pool.query(
          `UPDATE public.cart_items SET quantity = $3, updated_at = NOW()
           WHERE cart_id = $1 AND product_id = $2`,
          [cartId, productId, quantity],
        );
      }

      return this.getOrCreateCart(userId);
    } catch (error) {
      this.logger.error(`Failed to update cart item: ${error.message}`);
      return { success: false, message: error.message || 'Failed to update cart' };
    }
  }

  async removeFromCart(userId: string, productId: string): Promise<CartResponse> {
    return this.updateCartItem(userId, productId, 0);
  }

  async clearCart(userId: string): Promise<CartResponse> {
    try {
      const cartResponse = await this.getOrCreateCart(userId);
      if (!cartResponse.success || !cartResponse.data) {
        return cartResponse;
      }

      await this.pool.query(
        `DELETE FROM public.cart_items WHERE cart_id = $1`,
        [cartResponse.data.id],
      );

      return this.getOrCreateCart(userId);
    } catch (error) {
      this.logger.error(`Failed to clear cart: ${error.message}`);
      return { success: false, message: error.message || 'Failed to clear cart' };
    }
  }

  private async buildCartResponse(cartRow: {
    id: string;
    user_id: string;
    status: string;
    created_at: Date;
    updated_at: Date;
  }): Promise<Cart> {
    const itemsResult = await this.pool.query<{
      id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      product_name: string;
      product_name_si: string | null;
      sku: string;
      current_stock: number;
    }>(
      `SELECT
         ci.id,
         ci.product_id,
         ci.quantity,
         ci.unit_price,
         p.name as product_name,
         p.name_si as product_name_si,
         p.sku,
         COALESCE(p.stock_quantity, 0) as current_stock
       FROM public.cart_items ci
       JOIN public.products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC`,
      [cartRow.id],
    );

    const items: CartItem[] = itemsResult.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      productNameSi: row.product_name_si,
      sku: row.sku,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      totalPrice: Number(row.unit_price) * row.quantity,
      currentStock: Number(row.current_stock),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cartRow.id,
      userId: cartRow.user_id,
      status: cartRow.status as Cart['status'],
      items,
      itemCount,
      subtotal,
      createdAt: cartRow.created_at.toISOString(),
      updatedAt: cartRow.updated_at.toISOString(),
    };
  }

}
