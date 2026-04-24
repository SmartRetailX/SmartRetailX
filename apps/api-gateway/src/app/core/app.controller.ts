import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { firstValueFrom, timeout } from 'rxjs';

import { CoreService } from './app.service';

interface AuthenticatedRequest {
  user?: { id: string; email?: string; role?: string };
}

type GatewayResponse = {
  success?: boolean;
  data?: unknown;
  message?: string;
};

@ApiTags('Core Service')
@Controller('core')
export class CoreController {
  private readonly logger = new Logger(CoreController.name);

  constructor(private readonly coreService: CoreService) {}

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    return req.user;
  }

  private requireAdmin(req: AuthenticatedRequest) {
    const user = this.requireUser(req);

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return user;
  }

  private isSuccessfulResponse(response: unknown): response is GatewayResponse {
    return Boolean(
      response &&
        typeof response === 'object' &&
        'success' in response &&
        (response as GatewayResponse).success,
    );
  }

  private parsePaginationQuery(
    page: string | undefined,
    limit: string | undefined,
    offset: string | undefined,
    defaultLimit: number,
    maxLimit: number,
  ) {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(Math.floor(parsedLimit), maxLimit))
      : defaultLimit;

    const parsedOffset = Number(offset);
    if (Number.isFinite(parsedOffset) && parsedOffset >= 0) {
      const safeOffset = Math.floor(parsedOffset);

      return {
        page: Math.floor(safeOffset / safeLimit) + 1,
        limit: safeLimit,
        offset: safeOffset,
      };
    }

    const parsedPage = Number(page);
    const safePage = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;

    return {
      page: safePage,
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Core service health check',
    description: 'Returns the health status of the core microservice',
  })
  @ApiResponse({ status: 200, description: 'Core service health status' })
  async getHealth() {
    try {
      return await firstValueFrom(this.coreService.getMicroserviceHealth().pipe(timeout(5000)));
    } catch (error) {
      this.logger.error('Failed to retrieve core service health', error.message);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve core service health',
      };
    }
  }

  @Get('products')
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Get catalog products',
    description: 'Returns paginated products from core-service catalog in shopping-friendly format',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'name' })
  @ApiQuery({ name: 'sortDir', required: false, type: String, example: 'asc' })
  @ApiResponse({ status: 200, description: 'Catalog products retrieved successfully' })
  async getCatalogProducts(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const pagination = this.parsePaginationQuery(page, limit, offset, 20, 100);

    try {
      return await firstValueFrom(
        this.coreService
          .getCatalogProducts({
            search,
            category,
            ...pagination,
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
            page: pagination.page,
            limit: pagination.limit,
            offset: pagination.offset,
            total: 0,
            totalPages: 0,
          },
        },
      };
    }
  }

  @Get('products/:productId')
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Get product details',
    description: 'Returns a single product from the core-service catalog',
  })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Catalog product retrieved successfully' })
  async getCatalogProduct(@Param('productId') productId: string) {
    try {
      return await firstValueFrom(this.coreService.getProduct(productId).pipe(timeout(8000)));
    } catch (error) {
      this.logger.error('Failed to retrieve catalog product', error.message);
      return { success: false, message: error.message || 'Failed to retrieve catalog product' };
    }
  }

  @Get('categories')
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Get catalog categories',
    description: 'Returns category list from core-service catalog',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Catalog categories retrieved successfully' })
  async getCatalogCategories(@Query('limit') limit?: string) {
    const parsedLimit = Number.isFinite(Number(limit)) ? Number(limit) : 200;

    try {
      return await firstValueFrom(
        this.coreService.getCatalogCategories(parsedLimit).pipe(timeout(8000)),
      );
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

  @Get('cart')
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);

    try {
      return await firstValueFrom(this.coreService.getCart(user.id).pipe(timeout(8000)));
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
    const user = this.requireUser(req);

    try {
      const response = await firstValueFrom(
        this.coreService.addToCart(user.id, body.productId, body.quantity ?? 1).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'cart.updated',
          data: response,
        });
      }

      return response;
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
    const user = this.requireUser(req);

    try {
      const response = await firstValueFrom(
        this.coreService.updateCartItem(user.id, productId, body.quantity).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'cart.updated',
          data: response,
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to update cart item', error.message);
      return { success: false, message: error.message || 'Failed to update cart item' };
    }
  }

  @Delete('cart/items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeFromCart(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const user = this.requireUser(req);

    try {
      const response = await firstValueFrom(
        this.coreService.removeFromCart(user.id, productId).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'cart.updated',
          data: response,
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to remove from cart', error.message);
      return { success: false, message: error.message || 'Failed to remove from cart' };
    }
  }

  @Delete('cart')
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);

    try {
      const response = await firstValueFrom(
        this.coreService.clearCart(user.id).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'cart.updated',
          data: response,
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to clear cart', error.message);
      return { success: false, message: error.message || 'Failed to clear cart' };
    }
  }

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
    @Body()
    body: {
      shippingAddress?: Record<string, string>;
      billingAddress?: Record<string, string>;
      notes?: string;
    },
  ) {
    const user = this.requireUser(req);

    try {
      const response = await firstValueFrom(
        this.coreService
          .createOrder({
            userId: user.id,
            shippingAddress: body.shippingAddress,
            billingAddress: body.billingAddress,
            notes: body.notes,
          })
          .pipe(timeout(15000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'order.created',
          data: response,
        });
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'cart.updated',
          data: { success: true },
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to create order', error.message);
      return { success: false, message: error.message || 'Failed to create order' };
    }
  }

  @Get('orders')
  @ApiOperation({ summary: 'List user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async listOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
  ) {
    const user = this.requireUser(req);
    const pagination = this.parsePaginationQuery(page, limit, offset, 10, 50);

    try {
      return await firstValueFrom(
        this.coreService
          .listOrders(user.id, {
            ...pagination,
            status,
          })
          .pipe(timeout(8000)),
      );
    } catch (error) {
      this.logger.error('Failed to list orders', error.message);
      return {
        success: false,
        message: error.message || 'Failed to list orders',
        data: { orders: [], pagination: { ...pagination, total: 0, totalPages: 0 } },
      };
    }
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async getOrder(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string) {
    const user = this.requireUser(req);

    try {
      return await firstValueFrom(this.coreService.getOrder(user.id, orderId).pipe(timeout(8000)));
    } catch (error) {
      this.logger.error('Failed to get order', error.message);
      return { success: false, message: error.message || 'Failed to get order' };
    }
  }

  @Post('orders/:orderId/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string) {
    const user = this.requireUser(req);

    try {
      const response = await firstValueFrom(
        this.coreService.cancelOrder(user.id, orderId).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.sendRealtimeEventToUser({
          userId: user.id,
          event: 'order.cancelled',
          data: response,
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to cancel order', error.message);
      return { success: false, message: error.message || 'Failed to cancel order' };
    }
  }

  @Get('admin/orders')
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async listAllOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    this.requireAdmin(req);
    const pagination = this.parsePaginationQuery(page, limit, offset, 10, 50);

    try {
      return await firstValueFrom(
        this.coreService
          .listAllOrders({
            ...pagination,
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
        data: { orders: [], pagination: { ...pagination, total: 0, totalPages: 0 } },
      };
    }
  }

  @Get('admin/orders/:orderId')
  @ApiOperation({ summary: 'Get order details (admin)' })
  @ApiParam({ name: 'orderId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async getOrderAdmin(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(this.coreService.getOrderAdmin(orderId).pipe(timeout(8000)));
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
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    const adminUser = this.requireAdmin(req);

    try {
      const response = await firstValueFrom(
        this.coreService.updateOrderStatus(orderId, body.status).pipe(timeout(8000)),
      );

      if (
        this.isSuccessfulResponse(response) &&
        response.data &&
        typeof response.data === 'object' &&
        'userId' in response.data
      ) {
        this.coreService.sendRealtimeEventToUser({
          userId: String((response.data as { userId: string }).userId),
          event: 'order.status.updated',
          data: response,
        });
        this.coreService.broadcastRealtimeEvent({
          event: 'admin.order.updated',
          data: { orderId, status: body.status, updatedBy: adminUser.id },
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to update order status', error.message);
      return { success: false, message: error.message || 'Failed to update order status' };
    }
  }

  @Get('admin/products')
  @ApiOperation({ summary: 'List all products including inactive (admin)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortDir', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async listAllProducts(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    this.requireAdmin(req);
    const pagination = this.parsePaginationQuery(page, limit, offset, 20, 200);

    try {
      return await firstValueFrom(
        this.coreService
          .getCatalogProducts({
            search,
            category,
            ...pagination,
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
        data: { products: [], pagination: { ...pagination, total: 0, totalPages: 0 } },
      };
    }
  }

  @Get('admin/products/:productId')
  @ApiOperation({ summary: 'Get product details (admin)' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  async getProductAdmin(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(this.coreService.getProduct(productId).pipe(timeout(8000)));
    } catch (error) {
      this.logger.error('Failed to get product', error.message);
      return { success: false, message: error.message || 'Failed to get product' };
    }
  }

  @Post('admin/products/translate')
  @ApiOperation({ summary: 'Preview Sinhala translation for product fields (admin)' })
  async translateProductFields(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name?: string; description?: string },
  ) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(
        this.coreService.translateProductFields(body).pipe(timeout(15000)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to translate product fields';
      this.logger.error('Failed to translate product fields', message);
      return {
        success: false,
        message,
        data: {
          nameSi: null,
          descriptionSi: null,
        },
      };
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
        description: { type: 'string' },
        descriptionSi: { type: 'string' },
        categoryId: { type: 'string' },
        categoryName: { type: 'string' },
        categoryNameSi: { type: 'string' },
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
    @Body()
    body: {
      sku: string;
      name: string;
      nameSi?: string;
      description?: string;
      descriptionSi?: string;
      categoryId?: string;
      categoryName?: string;
      categoryNameSi?: string;
      price: number;
      stockQuantity: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    const adminUser = this.requireAdmin(req);

    try {
      const response = await firstValueFrom(
        this.coreService.createProduct({ ...body, createdBy: adminUser.id }).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.broadcastRealtimeEvent({
          event: 'catalog.product.created',
          data: response,
        });
      }

      return response;
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
        description: { type: 'string' },
        descriptionSi: { type: 'string' },
        categoryId: { type: 'string' },
        categoryName: { type: 'string' },
        categoryNameSi: { type: 'string' },
        price: { type: 'number' },
        stockQuantity: { type: 'number' },
        imageUrl: { type: 'string' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async updateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body()
    body: {
      name?: string;
      nameSi?: string;
      description?: string;
      descriptionSi?: string;
      categoryId?: string;
      categoryName?: string;
      categoryNameSi?: string;
      price?: number;
      stockQuantity?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    const adminUser = this.requireAdmin(req);

    try {
      const response = await firstValueFrom(
        this.coreService
          .updateProduct(productId, { ...body, createdBy: adminUser.id })
          .pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.broadcastRealtimeEvent({
          event: 'catalog.product.updated',
          data: response,
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Failed to update product', error.message);
      return { success: false, message: error.message || 'Failed to update product' };
    }
  }

  @Delete('admin/products/:productId')
  @ApiOperation({ summary: 'Delete product (admin)' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async deleteProduct(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    this.requireAdmin(req);

    try {
      const response = await firstValueFrom(
        this.coreService.deleteProduct(productId).pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.broadcastRealtimeEvent({
          event: 'catalog.product.deleted',
          data: { productId, ...response },
        });
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      this.logger.error('Failed to delete product', message);
      return { success: false, message };
    }
  }

  @Post('admin/products/:productId/stock-adjustments')
  @ApiOperation({ summary: 'Adjust product stock (admin)' })
  @ApiParam({ name: 'productId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantityChange: { type: 'number' },
        balanceTo: { type: 'number' },
        note: { type: 'string' },
      },
    },
  })
  async adjustProductStock(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() body: { quantityChange?: number; balanceTo?: number; note?: string },
  ) {
    const adminUser = this.requireAdmin(req);

    try {
      const response = await firstValueFrom(
        this.coreService
          .adjustProductStock(productId, { ...body, createdBy: adminUser.id })
          .pipe(timeout(8000)),
      );

      if (this.isSuccessfulResponse(response)) {
        this.coreService.broadcastRealtimeEvent({
          event: 'catalog.product.stock.updated',
          data: response,
        });
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to adjust product stock';
      this.logger.error('Failed to adjust product stock', message);
      return { success: false, message };
    }
  }

  @Get('admin/categories')
  @ApiOperation({ summary: 'List catalog categories (admin)' })
  async listAdminCategories(@Req() req: AuthenticatedRequest) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(this.coreService.listAdminCategories().pipe(timeout(8000)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list categories';
      this.logger.error('Failed to list categories', message);
      return { success: false, message, data: { categories: [] } };
    }
  }

  @Post('admin/categories')
  @ApiOperation({ summary: 'Create category (admin)' })
  async createCategory(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; nameSi?: string },
  ) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(this.coreService.createCategory(body).pipe(timeout(8000)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create category';
      this.logger.error('Failed to create category', message);
      return { success: false, message };
    }
  }

  @Patch('admin/categories/:categoryId')
  @ApiOperation({ summary: 'Update category (admin)' })
  async updateCategory(
    @Req() req: AuthenticatedRequest,
    @Param('categoryId') categoryId: string,
    @Body() body: { name?: string; nameSi?: string },
  ) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(
        this.coreService.updateCategory(categoryId, body).pipe(timeout(8000)),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      this.logger.error('Failed to update category', message);
      return { success: false, message };
    }
  }

  @Delete('admin/categories/:categoryId')
  @ApiOperation({ summary: 'Delete category (admin)' })
  async deleteCategory(@Req() req: AuthenticatedRequest, @Param('categoryId') categoryId: string) {
    this.requireAdmin(req);

    try {
      return await firstValueFrom(this.coreService.deleteCategory(categoryId).pipe(timeout(8000)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category';
      this.logger.error('Failed to delete category', message);
      return { success: false, message };
    }
  }
}
