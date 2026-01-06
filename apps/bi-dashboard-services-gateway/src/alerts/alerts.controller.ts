import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';

import { AlertsService } from './alerts.service';

@ApiTags('Alerts')
@Controller('alerts')

@ApiBearerAuth('JWT-auth')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get alerts',
    description: 'Retrieve AI-generated alerts and recommendations for restocking, expiring products, price optimization, and promotions with bilingual explanations.',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String, example: 'S001', description: 'Filter by store ID' })
  @ApiQuery({ name: 'type', required: false, enum: ['RESTOCK', 'EXPIRING', 'PRICE_OPTIMIZATION', 'PROMOTION'], description: 'Filter by alert type' })
  @ApiQuery({ name: 'urgency', required: false, enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'Filter by urgency level' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACCEPTED', 'DISMISSED'], description: 'Filter by status' })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          alerts: [
            {
              id: 'ALT0001',
              type: 'restock',
              urgency: 'high',
              productId: 'P0001',
              productName: 'Basmati Rice 5kg',
              productNameSi: 'බාස්මති සහල් 5kg',
              storeId: 'S001',
              storeName: 'Colombo Central Store',
              currentStock: 12,
              recommendedQuantity: 50,
              reason: 'Stock level below reorder point with high sales velocity',
              reasonSi: 'ඉහළ විකුණුම් වේගය සමඟ නැවත ඇණවුම් කිරීමේ ස්ථානයට වඩා තොග මට්ටම අඩුයි',
              confidence: 0.92,
              estimatedStockoutDate: '2025-12-05',
              status: 'pending',
              createdAt: '2025-12-01T08:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAlerts(@Query() query) {
    return this.alertsService.getAlerts(query);
  }

  @Post(':alertId/accept')
  @ApiOperation({
    summary: 'Accept alert',
    description: 'Accept an alert recommendation and optionally generate a purchase order or apply the recommended action.',
  })
  @ApiParam({ name: 'alertId', description: 'Alert ID', example: 'ALT0001' })
  @ApiBody({
    schema: {
      example: {
        action: 'create_po',
        quantity: 50,
        notes: 'Approved for immediate purchase',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Alert accepted successfully',
    schema: {
      example: {
        success: true,
        data: {
          alertId: 'ALT0001',
          status: 'accepted',
          purchaseOrderId: 'po_1733011200000',
          acceptedAt: '2025-12-01T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async acceptAlert(@Param('alertId') alertId: string, @Body() acceptDto) {
    return this.alertsService.acceptAlert(alertId, acceptDto);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate alerts',
    description: 'Trigger ML service to analyze inventory and generate restock alerts. This syncs AI-generated alerts into the database.',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String, example: 'S001', description: 'Generate alerts for specific store' })
  @ApiResponse({
    status: 201,
    description: 'Alerts generated successfully',
    schema: {
      example: {
        success: true,
        data: {
          alertsGenerated: 5,
          alerts: [
            {
              id: 'ALT0001',
              type: 'RESTOCK',
              urgency: 'HIGH',
              productId: 'P0003',
              storeId: 'S001',
              currentStock: 15,
              recommendedQuantity: 50,
              reason: 'Stock level at 15 units is below reorder point (35). With current sales velocity of 6.2 units/day, stockout expected in 2.4 days.',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Failed to generate alerts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateAlerts(@Query('storeId') storeId?: string) {
    return this.alertsService.generateAlerts(storeId);
  }

  @Post('auto-dismiss')
  @ApiOperation({
    summary: 'Auto-dismiss resolved alerts',
    description: 'Automatically dismiss alerts for products that are back in stock above reorder level.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto-dismissal completed',
    schema: {
      example: {
        success: true,
        data: {
          dismissedCount: 3,
          message: 'Auto-dismissed 3 resolved alerts',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async autoDismissResolvedAlerts() {
    return this.alertsService.autoDismissResolvedAlerts();
  }
}
