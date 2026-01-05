import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PromotionsService } from './promotions.service';

@ApiTags('Promotions')
@Controller('promotions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get promotions',
    description: 'Retrieve list of active and scheduled promotional campaigns with discount rules and performance metrics.',
  })
  @ApiQuery({ name: 'storeId', required: false, type: String, example: 'S001', description: 'Filter by store ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'SCHEDULED', 'EXPIRED'], description: 'Filter by promotion status' })
  @ApiResponse({
    status: 200,
    description: 'Promotions retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          promotions: [
            {
              id: 'PRM0001',
              name: 'December Super Sale',
              nameSi: 'දෙසැම්බර් සුපිරි අලෙවිය',
              description: '20% off on selected items',
              descriptionSi: 'තෝරාගත් භාණ්ඩ සඳහා 20% වට්ටම',
              type: 'PERCENTAGE',
              discountValue: 20,
              storeId: 'S001',
              startDate: '2025-12-01',
              endDate: '2025-12-31',
              status: 'ACTIVE',
              applicableProducts: ['P0001', 'P0002'],
              minPurchaseAmount: 5000.00,
              usageCount: 125,
              totalRevenue: 450000.00,
              createdAt: '2025-11-15T10:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPromotions(@Query() query) {
    return this.promotionsService.getPromotions(query);
  }

  @Get(':promotionId')
  @ApiOperation({
    summary: 'Get promotion',
    description: 'Retrieve detailed information about a specific promotion including usage analytics.',
  })
  @ApiParam({ name: 'promotionId', description: 'Promotion ID', example: 'PRM0001' })
  @ApiResponse({
    status: 200,
    description: 'Promotion retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'PRM0001',
          name: 'December Super Sale',
          nameSi: 'දෙසැම්බර් සුපිරි අලෙවිය',
          description: '20% off on selected items',
          type: 'PERCENTAGE',
          discountValue: 20,
          status: 'ACTIVE',
          analytics: {
            usageCount: 125,
            totalRevenue: 450000.00,
            averageOrderValue: 3600.00,
            conversionRate: 15.5,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPromotion(@Param('promotionId') promotionId: string) {
    return this.promotionsService.getPromotion(promotionId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create promotion',
    description: 'Create a new promotional campaign with discount rules and date range.',
  })
  @ApiBody({
    schema: {
      example: {
        name: 'New Year Sale',
        nameSi: 'අලුත් අවුරුදු අලෙවිය',
        description: '15% off storewide',
        descriptionSi: 'සියලුම භාණ්ඩ සඳහා 15% වට්ටම',
        type: 'PERCENTAGE',
        discountValue: 15,
        storeId: 'S001',
        startDate: '2026-01-01',
        endDate: '2026-01-15',
        applicableProducts: [],
        minPurchaseAmount: 2000.00,
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Promotion created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'PRM0010',
          name: 'New Year Sale',
          status: 'SCHEDULED',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPromotion(@Body() createPromotionDto) {
    return this.promotionsService.createPromotion(createPromotionDto);
  }

  @Patch(':promotionId')
  @ApiOperation({
    summary: 'Update promotion',
    description: 'Update promotion details or status.',
  })
  @ApiParam({ name: 'promotionId', description: 'Promotion ID', example: 'PRM0001' })
  @ApiBody({
    schema: {
      example: {
        discountValue: 25,
        endDate: '2026-01-20',
        status: 'ACTIVE',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Promotion updated successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePromotion(@Param('promotionId') promotionId: string, @Body() updatePromotionDto) {
    return this.promotionsService.updatePromotion(promotionId, updatePromotionDto);
  }

  @Delete(':promotionId')
  @ApiOperation({
    summary: 'Delete promotion',
    description: 'Soft delete a promotion campaign.',
  })
  @ApiParam({ name: 'promotionId', description: 'Promotion ID', example: 'PRM0001' })
  @ApiResponse({ status: 200, description: 'Promotion deleted successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deletePromotion(@Param('promotionId') promotionId: string) {
    return this.promotionsService.deletePromotion(promotionId);
  }
}
