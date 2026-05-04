import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AlertsService } from './alerts.service';

@ApiTags('Alerts')
@Controller('alerts')
@ApiBearerAuth('JWT-auth')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get AI-generated alerts',
    description:
      'Retrieve ML-generated alerts for inventory restocking with AI confidence scores, ' +
      'bilingual explanations (English & Sinhala), and stockout predictions. ' +
      'Alerts include recommended purchase quantities and urgency levels (HIGH/MEDIUM/LOW).',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    enum: ['RESTOCK'],
    description: 'Filter by alert type (currently: RESTOCK)',
    example: 'RESTOCK',
  })
  @ApiQuery({
    name: 'urgency',
    required: false,
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    description: 'Filter by urgency level (HIGH = stockout <3 days, MEDIUM = 3-7 days, LOW = >7 days)',
    example: 'HIGH',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    description: 'Filter by alert status. Default: PENDING (show unresolved alerts)',
    example: 'PENDING',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          count: 2,
          alerts: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              type: 'RESTOCK',
              urgency: 'high',
              productId: 'db-uuid-abc123',
              productSku: 'P001',
              productName: 'Widget A',
              productNameSi: 'විජට් ඒ',
              currentStock: 12,
              recommendedQuantity: 180,
              reason:
                'AI predicts stockout in 1.5 days (demand: 8.0 units/day). Current stock (12) is below reorder level (50).',
              reasonSi:
                'AI දින 1.5 කින් තොග අවසන් වීම පුරෝකථනය කරයි (ඉල්ලුම: දිනකට ඒකක 8.0). වත්මන් තොගය (12) නැවත ඇණවුම් මට්ටමට (50) පහළ ය.',
              confidence: 0.92,
              estimatedStockoutDate: '2025-05-05',
              status: 'pending',
              createdAt: '2025-05-04T12:34:56Z',
              updatedAt: '2025-05-04T12:34:56Z',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              type: 'RESTOCK',
              urgency: 'medium',
              productId: 'db-uuid-def456',
              productSku: 'P002',
              productName: 'Gadget B',
              productNameSi: 'ගැජට් බී',
              currentStock: 35,
              recommendedQuantity: 120,
              reason:
                'AI predicts stockout in 7.2 days (demand: 5.0 units/day). Current stock (35) is below reorder level (60).',
              reasonSi:
                'AI දින 7.2 කින් තොග අවසන් වීම පුරෝකථනය කරයි (ඉල්ලුම: දිනකට ඒකක 5.0). වත්මන් තොගය (35) නැවත ඇණවුම් මට්ටමට (60) පහළ ය.',
              confidence: 0.85,
              estimatedStockoutDate: '2025-05-11',
              status: 'pending',
              createdAt: '2025-05-04T11:00:00Z',
              updatedAt: '2025-05-04T11:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Database error' })
  async getAlerts(@Query() query) {
    return this.alertsService.getAlerts(query);
  }

  @Post(':alertId/accept')
  @ApiOperation({
    summary: 'Accept a restock alert',
    description:
      'Accept an AI-generated restock alert and generate a purchase order. ' +
      'The alert will be marked as ACCEPTED and linked to the PO ID.',
  })
  @ApiParam({
    name: 'alertId',
    type: String,
    description: 'Alert UUID (from GET /alerts)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    schema: {
      example: {
        purchaseOrderId: 'PO-2025-0512-001',
        notes: 'Approved by manager, expedite shipping',
      },
    },
    description: 'Optional: purchaseOrderId and notes. If not provided, auto-generates PO ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert accepted successfully',
    schema: {
      example: {
        success: true,
        data: {
          alertId: '550e8400-e29b-41d4-a716-446655440001',
          status: 'accepted',
          purchaseOrderId: 'PO-1735811200000',
          acceptedAt: '2025-05-04T13:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Database error' })
  async acceptAlert(
    @Param('alertId') alertId: string,
    @Body() acceptDto: { purchaseOrderId?: string; notes?: string } = {},
  ) {
    return this.alertsService.acceptAlert(alertId, acceptDto);
  }

  @Post(':alertId/reject')
  @ApiOperation({
    summary: 'Reject a restock alert',
    description:
      'Reject an AI-generated restock alert. The alert will be marked as REJECTED ' +
      'with an optional reason (e.g., "Manager override", "Budget constraints").',
  })
  @ApiParam({
    name: 'alertId',
    type: String,
    description: 'Alert UUID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    schema: {
      example: {
        reason: 'Budget constraints this month',
      },
    },
    description: 'Optional: reason for rejection.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert rejected successfully',
    schema: {
      example: {
        success: true,
        data: {
          alertId: '550e8400-e29b-41d4-a716-446655440001',
          status: 'rejected',
          rejectionReason: 'Budget constraints this month',
          rejectedAt: '2025-05-04T13:05:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Database error' })
  async rejectAlert(
    @Param('alertId') alertId: string,
    @Body() rejectDto: { reason?: string } = {},
  ) {
    return this.alertsService.rejectAlert(alertId, rejectDto);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI alerts for all products',
    description:
      'Trigger the ML service to analyze inventory across all products and generate restock alerts. ' +
      'This endpoint calls the Python ML service (/api/v1/alerts/generate) and syncs results into the database. ' +
      'Usually called by a scheduled job (hourly/daily cron).',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts generated and synced successfully',
    schema: {
      example: {
        success: true,
        data: {
          alertsGenerated: 3,
          alerts: [
            {
              id: 'alert-uuid-1',
              productId: 'product-uuid-1',
              type: 'RESTOCK',
              urgency: 'HIGH',
              currentStock: 15,
              recommendedQuantity: 180,
              reason: 'Stock level at 15 units is below reorder point (50). Stockout in ~2.4 days.',
              confidence: 0.92,
              estimatedStockoutDate: '2025-05-05',
            },
            {
              id: 'alert-uuid-2',
              productId: 'product-uuid-2',
              type: 'RESTOCK',
              urgency: 'MEDIUM',
              currentStock: 35,
              recommendedQuantity: 120,
              reason: 'Stock level at 35 units is below reorder point (60). Stockout in ~7.2 days.',
              confidence: 0.85,
              estimatedStockoutDate: '2025-05-11',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'ML service unavailable',
    schema: {
      example: {
        statusCode: 503,
        message: 'Failed to generate alerts from ML service: Connection refused. Ensure ML service is running at http://localhost:8000',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateAlerts() {
    return this.alertsService.generateAlerts();
  }

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze single product for restock needs',
    description:
      'Analyze a specific product (by database UUID) to determine if a restock alert is needed. ' +
      'Calls the ML service with the product SKU and returns alert if stock is insufficient, ' +
      'or "OK" status if stock is adequate.',
  })
  @ApiBody({
    schema: {
      example: {
        productId: '550e8400-e29b-41d4-a716-446655440000',
      },
    },
    description: 'Product database UUID (from products.id)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product analyzed successfully — alert needed',
    schema: {
      example: {
        success: true,
        data: {
          alertNeeded: true,
          alert: {
            id: 'alert-uuid-123',
            productId: 'product-uuid',
            type: 'RESTOCK',
            urgency: 'HIGH',
            currentStock: 12,
            recommendedQuantity: 180,
            reason: 'AI predicts stockout in 1.5 days',
            reasonSi: 'AI දින 1.5 කින් තොග අවසන්...',
            confidence: 0.92,
            estimatedStockoutDate: '2025-05-05',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Product analyzed successfully — stock is adequate',
    schema: {
      example: {
        success: true,
        data: {
          alertNeeded: false,
          message: 'Stock adequate based on ML forecast',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 503,
    description: 'ML service unavailable',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeProductAlert(@Body() body: { productId: string }) {
    return this.alertsService.analyzeProductAlert(body.productId);
  }

  @Post('auto-dismiss')
  @ApiOperation({
    summary: 'Auto-dismiss resolved alerts',
    description:
      'Automatically dismiss PENDING alerts for products that are back in stock above their reorder level. ' +
      'This is useful as a cleanup job to mark false-positive alerts as resolved.',
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
  @ApiResponse({ status: 500, description: 'Database error' })
  async autoDismissResolvedAlerts() {
    return this.alertsService.autoDismissResolvedAlerts();
  }
}