import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';

import { CoreService } from './app.service';

interface AuthenticatedRequest {
  user?: { id: string; email?: string; role?: string };
}

@ApiTags('Core Service')
@Controller('core')
export class CoreController {
  private readonly logger = new Logger(CoreController.name);

  constructor(private readonly coreService: CoreService) {}

  /**
   * Core service health check endpoint
   * Returns the health status of the core microservice
   */
  @Get('health')
  @ApiOperation({
    summary: 'Core service health check',
    description: 'Returns the health status of the core microservice',
  })
  @ApiResponse({ status: 200, description: 'Core service health status' })
  async getHealth() {
    try {
      const health = await firstValueFrom(
        this.coreService.getMicroserviceHealth().pipe(timeout(5000)),
      );
      return health;
    } catch (error) {
      this.logger.error('Failed to retrieve core service health', error.message);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve core service health',
      };
    }
  }

  @Get('products')
  @ApiOperation({
    summary: 'Get catalog products',
    description: 'Returns paginated products from core-service catalog in shopping-friendly format',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'name' })
  @ApiQuery({ name: 'sortDir', required: false, type: String, example: 'asc' })
  @ApiResponse({ status: 200, description: 'Catalog products retrieved successfully' })
  async getCatalogProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const parsedPage = Number.isFinite(Number(page)) ? Number(page) : 1;
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 20;

    try {
      return await firstValueFrom(
        this.coreService
          .getCatalogProducts({
            search,
            category,
            page: parsedPage,
            limit: parsedLimit,
            sortBy,
            sortDir,
          })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to retrieve catalog products', error.message);
      return {
        success: false,
        message: error.message || 'Failed to retrieve catalog products',
        data: {
          products: [],
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: 0,
            totalPages: 0,
          },
        },
      };
    }
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get catalog categories',
    description: 'Returns category list from core-service catalog',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Catalog categories retrieved successfully' })
  async getCatalogCategories(@Query('limit') limit?: string) {
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 200;

    try {
      return await firstValueFrom(this.coreService.getCatalogCategories(parsedLimit).pipe(timeout(8000)));
    } catch (error) {
      this.logger.error('Failed to retrieve catalog categories', error.message);
      return {
        success: false,
        message: error.message || 'Failed to retrieve catalog categories',
        data: {
          categories: [],
        },
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CART ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('cart')
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(this.coreService.getCart(userId).pipe(timeout(8000)));
    } catch (error) {
      this.logger.error('Failed to get cart', error.message);
      return { success: false, message: error.message || 'Failed to get cart' };
    }
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number', default: 1 },
      },
      required: ['productId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Item added to cart' })
  async addToCart(
    @Req() req: AuthenticatedRequest,
    @Body() body: { productId: string; quantity?: number },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService.addToCart(userId, body.productId, body.quantity ?? 1).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to add to cart', error.message);
      return { success: false, message: error.message || 'Failed to add to cart' };
    }
  }

  @Patch('cart/items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number' },
      },
      required: ['quantity'],
    },
  })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  async updateCartItem(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService.updateCartItem(userId, productId, body.quantity).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to update cart item', error.message);
      return { success: false, message: error.message || 'Failed to update cart item' };
    }
  }

  @Delete('cart/items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeFromCart(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService.removeFromCart(userId, productId).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to remove from cart', error.message);
      return { success: false, message: error.message || 'Failed to remove from cart' };
    }
  }

  @Delete('cart')
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(this.coreService.clearCart(userId).pipe(timeout(8000)));
    } catch (error) {
      this.logger.error('Failed to clear cart', error.message);
      return { success: false, message: error.message || 'Failed to clear cart' };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ORDER ENDPOINTS (Customer)
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('orders')
  @ApiOperation({ summary: 'Create order from cart (checkout)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shippingAddress: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zipCode: { type: 'string' },
            country: { type: 'string' },
          },
        },
        billingAddress: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zipCode: { type: 'string' },
            country: { type: 'string' },
          },
        },
        notes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Order created successfully' })
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      shippingAddress?: Record<string, string>;
      billingAddress?: Record<string, string>;
      notes?: string;
    },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService
          .createOrder({
            userId,
            shippingAddress: body.shippingAddress,
            billingAddress: body.billingAddress,
            notes: body.notes,
          })
          .pipe(timeout(15000)),
      );
    } catch (error) {
      this.logger.error('Failed to create order', error.message);
      return { success: false, message: error.message || 'Failed to create order' };
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'List user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async listOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService
          .listOrders(userId, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            status,
          })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to list orders', error.message);
      return {
        success: false,
        message: error.message || 'Failed to list orders',
        data: { orders: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      };
    }
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async getOrder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService.getOrder(userId, orderId).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to get order', error.message);
      return { success: false, message: error.message || 'Failed to get order' };
    }
  }

  @Post('orders/:orderId/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, message: 'Unauthorized' };
    }

    try {
      return await firstValueFrom(
        this.coreService.cancelOrder(userId, orderId).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to cancel order', error.message);
      return { success: false, message: error.message || 'Failed to cancel order' };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ORDER ENDPOINTS (Admin)
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('admin/orders')
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async listAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      return await firstValueFrom(
        this.coreService
          .listAllOrders({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            status,
            search,
          })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to list all orders', error.message);
      return {
        success: false,
        message: error.message || 'Failed to list orders',
        data: { orders: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      };
    }
  }

  @Get('admin/orders/:orderId')
  @ApiOperation({ summary: 'Get order details (admin)' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async getOrderAdmin(@Param('orderId') orderId: string) {
    try {
      return await firstValueFrom(
        this.coreService.getOrderAdmin(orderId).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to get order', error.message);
      return { success: false, message: error.message || 'Failed to get order' };
    }
  }

  @Patch('admin/orders/:orderId/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    try {
      return await firstValueFrom(
        this.coreService.updateOrderStatus(orderId, body.status).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to update order status', error.message);
      return { success: false, message: error.message || 'Failed to update order status' };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRODUCT ENDPOINTS (Admin)
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('admin/products')
  @ApiOperation({ summary: 'List all products including inactive (admin)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async listAllProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    try {
      return await firstValueFrom(
        this.coreService
          .getCatalogProducts({
            search,
            category,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy,
            sortDir,
            activeOnly: false,
          })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to list products', error.message);
      return {
        success: false,
        message: error.message || 'Failed to list products',
        data: { products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      };
    }
  }

  @Get('admin/products/:productId')
  @ApiOperation({ summary: 'Get product details (admin)' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  async getProductAdmin(@Param('productId') productId: string) {
    try {
      return await firstValueFrom(
        this.coreService.getProduct(productId).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to get product', error.message);
      return { success: false, message: error.message || 'Failed to get product' };
    }
  }

  @Post('admin/products')
  @ApiOperation({ summary: 'Create new product (admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sku: { type: 'string' },
        name: { type: 'string' },
        nameSi: { type: 'string' },
        baseProduct: { type: 'string' },
        baseProductSi: { type: 'string' },
        description: { type: 'string' },
        descriptionSi: { type: 'string' },
        category: { type: 'string' },
        categorySi: { type: 'string' },
        price: { type: 'number' },
        stockQuantity: { type: 'number' },
        imageUrl: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['sku', 'name', 'price', 'stockQuantity'],
    },
  })
  @ApiResponse({ status: 200, description: 'Product created successfully' })
  async createProduct(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      sku: string;
      name: string;
      nameSi?: string;
      baseProduct?: string;
      baseProductSi?: string;
      description?: string;
      descriptionSi?: string;
      category?: string;
      categorySi?: string;
      price: number;
      stockQuantity: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    try {
      return await firstValueFrom(
        this.coreService
          .createProduct({ ...body, createdBy: req.user?.id })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to create product', error.message);
      return { success: false, message: error.message || 'Failed to create product' };
    }
  }

  @Patch('admin/products/:productId')
  @ApiOperation({ summary: 'Update product (admin)' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        nameSi: { type: 'string' },
        baseProduct: { type: 'string' },
        baseProductSi: { type: 'string' },
        description: { type: 'string' },
        descriptionSi: { type: 'string' },
        category: { type: 'string' },
        categorySi: { type: 'string' },
        price: { type: 'number' },
        stockQuantity: { type: 'number' },
        imageUrl: { type: 'string' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async updateProduct(
    @Param('productId') productId: string,
    @Body() body: {
      name?: string;
      nameSi?: string;
      baseProduct?: string;
      baseProductSi?: string;
      description?: string;
      descriptionSi?: string;
      category?: string;
      categorySi?: string;
      price?: number;
      stockQuantity?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    try {
      return await firstValueFrom(
        this.coreService.updateProduct(productId, body).pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to update product', error.message);
      return { success: false, message: error.message || 'Failed to update product' };
    }
  }

  @Delete('admin/products/:productId')
  @ApiOperation({ summary: 'Delete product (admin)' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async deleteProduct(@Param('productId') productId: string) {
    try {
      return await firstValueFrom(
        this.coreService.deleteProduct(productId).pipe(timeout(8000)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      this.logger.error('Failed to delete product', message);
      return { success: false, message };
    }
  }
}
