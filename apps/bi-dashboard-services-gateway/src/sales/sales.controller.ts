import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SalesService } from './sales.service';

@ApiTags('Sales')
@Controller('sales')
@ApiBearerAuth('JWT-auth')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get sales transactions',
    description:
      'Retrieve paginated list of sales transactions with optional filtering by date range and store.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'storeId', required: false, type: String, example: 'S001' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-12-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Sales transactions retrieved',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'SAL0001',
            transactionId: 'TXN-2025-12-04-000001',
            totalAmount: 218.2,
            finalAmount: 196.38,
            discount: 21.82,
            paymentMethod: 'CARD',
            timestamp: '2025-12-04T10:30:00Z',
            items: [
              {
                productId: '70001',
                productName: 'Basmati Rice 5kg',
                quantity: 4,
                price: 54.55,
              },
            ],
          },
        ],
      },
    },
  })
  async getSales(@Query() query, @Req() req) {
    return this.salesService.getSales(query, req.user);
  }

  @Post()
  @ApiOperation({
    summary: 'Record new sale',
    description:
      'Create a new sales transaction with line items. Automatically updates product stock levels.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sale recorded successfully',
  })
  async createSale(@Body() createSaleDto, @Req() req) {
    return this.salesService.createSale(createSaleDto, req.user);
  }

  @Get('aggregate')
  @ApiOperation({
    summary: 'Get sales analytics',
    description:
      'Get aggregated sales data including total revenue, top products, and daily trends for specified date range.',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String, example: 'S001' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-12-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated sales data',
    schema: {
      example: {
        success: true,
        data: {
          totalRevenue: 12450.5,
          totalOrders: 240,
          averageOrderValue: 51.88,
          topProducts: [
            {
              productId: '70001',
              productName: 'Basmati Rice 5kg',
              totalQuantity: 150,
              totalRevenue: 8182.5,
            },
          ],
          dailyTrends: [{ date: '2025-12-04', revenue: 1245.0, orders: 22 }],
        },
      },
    },
  })
  async getAggregate(@Query() query, @Req() req) {
    return this.salesService.getAggregate(query, req.user);
  }
}
