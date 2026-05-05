import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Retrieve paginated list of products with optional filtering by store, category, status, and search query. Supports bilingual names (English/Sinhala).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category',
    example: 'Groceries',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
    description: 'Filter by stock status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or SKU',
    example: 'Ambarella',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          products: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Ambarella',
              nameSi: 'අඹරැල්ලා',
              sku: '916002',
              description: 'Tangy and fiber-rich local fruit used for chutneys and curries',
              categoryId: 'cat-001',
              brand: 'Local',
              purchaseFrequency: 'medium',
              price: 560,
              cost: 420,
              currentStock: 100,
              reorderLevel: 50,
              maxStock: 300,
              status: 'in_stock',
              supplier: 'Local Suppliers Ltd',
              lastRestocked: '2026-05-04T10:00:00Z',
              imageUrl: 'https://cdn.example.com/products/ambarella.jpg',
              isActive: true,
              createdAt: '2026-05-04T10:00:00Z',
              updatedAt: '2026-05-04T10:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 20,
            totalPages: 2,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProducts(@Query() query, @Req() req) {
    return this.productsService.getProducts(query, req.user);
  }

  @Get(':productId')
  @ApiOperation({
    summary: 'Get product by ID',
    description:
      'Retrieve detailed information about a specific product including stock levels and sales history.',
  })
  @ApiParam({ name: 'productId', description: 'Product UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Ambarella',
          nameSi: 'අඹරැල්ලා',
          sku: '916002',
          description: 'Tangy and fiber-rich local fruit used for chutneys and curries',
          categoryId: 'cat-001',
          brand: 'Local',
          purchaseFrequency: 'medium',
          price: 560,
          cost: 420,
          currentStock: 100,
          reorderLevel: 50,
          maxStock: 300,
          status: 'in_stock',
          supplier: 'Local Suppliers Ltd',
          lastRestocked: '2026-05-04T10:00:00Z',
          imageUrl: 'https://cdn.example.com/products/ambarella.jpg',
          isActive: true,
          createdAt: '2026-05-04T10:00:00Z',
          updatedAt: '2026-05-04T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProduct(@Param('productId') productId: string) {
    return this.productsService.getProduct(productId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new product',
    description: 'Add a new product to the inventory with bilingual support.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Green Tea 100g',
          nameSi: 'හරිත තේ 100g',
          sku: 'TEA-001',
          description: 'Premium quality green tea',
          categoryId: 'cat-002',
          brand: 'Ceylon Tea',
          purchaseFrequency: 'high',
          price: 450.0,
          cost: 300.0,
          currentStock: 50,
          reorderLevel: 20,
          maxStock: 200,
          status: 'in_stock',
          imageUrl: 'https://cdn.example.com/products/green-tea.jpg',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createProduct(@Body() createProductDto, @Req() req) {
    return this.productsService.createProduct(createProductDto, req.user);
  }

  @Patch(':productId')
  @ApiOperation({
    summary: 'Update product',
    description: 'Update product details including price, stock, and metadata.',
  })
  @ApiParam({ name: 'productId', description: 'Product UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProduct(@Param('productId') productId: string, @Body() updateProductDto, @Req() req) {
    return this.productsService.updateProduct(productId, updateProductDto, req.user);
  }

  @Delete(':productId')
  @ApiOperation({
    summary: 'Delete product',
    description:
      'Soft delete a product from the inventory. Product data is retained for historical records.',
  })
  @ApiParam({ name: 'productId', description: 'Product UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Product deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteProduct(@Param('productId') productId: string, @Req() req) {
    return this.productsService.deleteProduct(productId, req.user);
  }
}
