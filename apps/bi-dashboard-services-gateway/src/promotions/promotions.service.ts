import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async getPromotions(query: any) {
    const { storeId, status } = query;
    const where: any = {};

    if (storeId && storeId !== 'undefined') where.storeId = storeId;
    if (status && status !== 'undefined') {
      where.status = status.toUpperCase();
    } else {
      // Default to showing active and scheduled promotions
      where.status = { in: ['ACTIVE', 'SCHEDULED'] };
    }

    const promotions = await this.prisma.promotion.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });

    return {
      success: true,
      data: {
        promotions: promotions.map(p => ({
          id: p.id,
          name: p.name,
          nameSi: p.nameSi,
          description: '',
          descriptionSi: '',
          type: 'PERCENTAGE',
          discountValue: p.discount,
          storeId: p.storeId,
          startDate: p.startDate.toISOString().split('T')[0],
          endDate: p.endDate.toISOString().split('T')[0],
          status: p.status,
          applicableProducts: [],
          minPurchaseAmount: 0,
          usageCount: 0,
          totalRevenue: p.actualRevenue,
          createdAt: p.createdAt,
        })),
      },
    };
  }

  async getPromotion(promotionId: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new Error('Promotion not found');
    }

    return {
      success: true,
      data: {
        id: promotion.id,
        name: promotion.name,
        nameSi: promotion.nameSi,
        description: '',
        descriptionSi: '',
        type: 'PERCENTAGE',
        discountValue: promotion.discount,
        storeId: promotion.storeId,
        startDate: promotion.startDate.toISOString().split('T')[0],
        endDate: promotion.endDate.toISOString().split('T')[0],
        status: promotion.status,
        applicableProducts: [],
        minPurchaseAmount: 0,
        analytics: {
          usageCount: 0,
          totalRevenue: promotion.actualRevenue,
          averageOrderValue: 0,
          conversionRate: 0,
        },
        createdAt: promotion.createdAt,
      },
    };
  }

  async createPromotion(createPromotionDto: any) {
    const promotion = await this.prisma.promotion.create({
      data: {
        name: createPromotionDto.name,
        nameSi: createPromotionDto.nameSi,
        discount: createPromotionDto.discountValue,
        storeId: createPromotionDto.storeId,
        startDate: new Date(createPromotionDto.startDate),
        endDate: new Date(createPromotionDto.endDate),
        status: new Date(createPromotionDto.startDate) > new Date() ? 'SCHEDULED' : 'ACTIVE',
        targetedRevenue: createPromotionDto.targetedRevenue || 0,
        actualRevenue: 0,
        lift: 0,
      },
    });

    return {
      success: true,
      data: {
        id: promotion.id,
        name: promotion.name,
        status: promotion.status,
      },
    };
  }

  async updatePromotion(promotionId: string, updatePromotionDto: any) {
    const data: any = {};
    
    if (updatePromotionDto.discountValue !== undefined) data.discount = updatePromotionDto.discountValue;
    if (updatePromotionDto.endDate) data.endDate = new Date(updatePromotionDto.endDate);
    if (updatePromotionDto.status) data.status = updatePromotionDto.status.toUpperCase();

    await this.prisma.promotion.update({
      where: { id: promotionId },
      data,
    });

    return {
      success: true,
      message: 'Promotion updated successfully',
    };
  }

  async deletePromotion(promotionId: string) {
    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: { status: 'CANCELLED' },
    });

    return {
      success: true,
      message: 'Promotion deleted successfully',
    };
  }
}
