import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
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
    description: 'Retrieve paginated list of products with optional filtering by store, category, status, and search query. Supports bilingual names (English/Sinhala).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'storeId', required: false, type: String, description: 'Filter by store ID', example: 'S001' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category', example: 'Groceries' })
  @ApiQuery({ name: 'status', required: false, enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'], description: 'Filter by stock status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, SKU, or barcode', example: 'Basmati' })
  @ApiResponse({ 
    status: 200, 
    description: 'Products retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'P0001',
            name: 'Basmati Rice 5kg',
            nameSi: 'බාස්මති සහල් 5kg',
            sku: 'GRO-P0001',
            barcode: '89000000000001',
            category: 'Groceries',
            categorySi: 'ආහාර',
            price: 54.55,
            costPrice: 40.91,
            stock: 50,
            reorderLevel: 20,
            status: 'IN_STOCK',
            unit: 'kg',
            image: 'https://cdn.example.com/products/basmati-rice.jpg',
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProducts(@Query() query, @Req() req) {
    return this.productsService.getProducts(query, req.user);
  }

  @Get(':productId')
  @ApiOperation({ 
    summary: 'Get product by ID',
    description: 'Retrieve detailed information about a specific product including stock levels and sales history.',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', example: 'P0001' })
  @ApiResponse({ 
    status: 200, 
    description: 'Product retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'P0001',
          name: 'Basmati Rice 5kg',
          nameSi: 'බාස්මති සහල් 5kg',
          sku: 'GRO-P0001',
          barcode: '89000000000001',
          category: 'Groceries',
          categorySi: 'ආහාර',
          price: 54.55,
          costPrice: 40.91,
          stock: 50,
          reorderLevel: 20,
          status: 'IN_STOCK',
          unit: 'kg',
          description: 'Premium quality Basmati rice 5kg pack',
          image: 'https://cdn.example.com/products/basmati-rice.jpg',
          store: {
            id: 'S001',
            name: 'Colombo Central Store',
          },
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
          id: 'P0016',
          name: 'Green Tea 100g',
          nameSi: 'හරිත තේ 100g',
          sku: 'SKU-TEA-001',
          category: 'Beverages',
          price: 450.00,
          stock: 50,
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
  @ApiParam({ name: 'productId', description: 'Product ID', example: 'P0001' })
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
    description: 'Soft delete a product from the inventory. Product data is retained for historical records.',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', example: 'P0001' })
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
