import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get inventory status',
    description: 'Retrieve current inventory status with stock levels, reorder alerts, and value metrics for all products.',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String, example: 'S001', description: 'Filter by store ID' })
  @ApiResponse({
    status: 200,
    description: 'Inventory status retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          summary: {
            totalProducts: 20,
            inStock: 16,
            lowStock: 3,
            outOfStock: 1,
            totalValue: 10985.50,
          },
          items: [
            {
              productId: 'P0001',
              productName: 'Basmati Rice 5kg',
              storeId: 'S001',
              currentStock: 50,
              reorderLevel: 20,
              status: 'in_stock',
              daysUntilStockout: 12,
              lastRestocked: '2025-11-25T10:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@Query() query) {
    return this.inventoryService.getStatus(query);
  }

  @Post('restock')
  @ApiOperation({
    summary: 'Record restock transaction',
    description: 'Add new inventory stock for a product and record the movement with supplier details.',
  })
  @ApiBody({
    schema: {
      example: {
        productId: 'P0001',
        storeId: 'S001',
        quantity: 100,
        cost: 4091.00,
        supplier: 'ABC Distributors',
        invoiceNumber: 'INV-2025-12-001',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Restock recorded successfully',
    schema: {
      example: {
        success: true,
        data: {
          restockId: 'rst_1733318400000',
          productId: 'P0001',
          newStock: 150,
          timestamp: '2025-12-04T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async restock(@Body() restockDto) {
    return this.inventoryService.restock(restockDto);
  }
}
