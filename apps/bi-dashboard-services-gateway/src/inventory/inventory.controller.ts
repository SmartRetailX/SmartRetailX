import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@Controller('inventory')
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get inventory status',
    description:
      'Retrieve current inventory status with stock levels, reorder alerts, and value metrics for all products.',
  })
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
            totalValue: 10985.5,
          },
          items: [
            {
              productId: '70001',
              productName: 'Basmati Rice 5kg',
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
    description:
      'Add new inventory stock for a product and record the movement with supplier details.',
  })
  @ApiBody({
    schema: {
      example: {
        productId: '70001',
        quantity: 100,
        cost: 4091.0,
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
          productId: '70001',
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
