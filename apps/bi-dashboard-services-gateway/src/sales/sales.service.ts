import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sales Service
 * 
 * ⚠️ IMPORTANT: ML Training Data Source
 * 
 * Sales recorded through this API are stored in PostgreSQL for:
 * - Transaction history and record keeping
 * - Revenue reports and analytics
 * - Customer tracking and RFM segmentation
 * - Audit trail and compliance
 * 
 * ML models (Prophet, XGBoost) use Kaggle dataset for training and forecasting
 * (./ml-service/data/kaggle_sales_data.csv) to ensure reproducible results
 * for research/demo purposes.
 * 
 * This means: New sales recorded here do NOT automatically retrain ML models.
 * 
 * For production deployment with adaptive ML that learns from real sales,
 * see: DATA-FLOW-STRATEGY.md "Production Mode"
 */
@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async getSales(query: any, user: any) {
    const {
      startDate,
      endDate,
      storeId,
      productId,
      page = 1,
      limit = 100,
    } = query;

    if (!startDate || !endDate) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'startDate and endDate are required',
      });
    }

    const skip = (page - 1) * limit;
    const where: any = {
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (storeId) where.storeId = storeId;

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    const totalRevenue = await this.prisma.sale.aggregate({
      where,
      _sum: { finalAmount: true },
    });

    const totalProfit = await this.prisma.saleItem.aggregate({
      where: {
        sale: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
      _sum: { profit: true },
    });

    const avgOrder = totalRevenue._sum.finalAmount / total || 0;

    return {
      success: true,
      data: {
        sales: sales.map((s) => ({
          id: s.id,
          transactionId: s.transactionId,
          storeId: s.storeId,
          productId: s.items[0]?.productId,
          quantity: s.items.reduce((sum, item) => sum + item.quantity, 0),
          unitPrice: s.items[0]?.unitPrice,
          revenue: s.finalAmount,
          cost: s.items.reduce((sum, item) => sum + item.cost, 0),
          profit: s.items.reduce((sum, item) => sum + item.profit, 0),
          discount: s.discount,
          promotionId: s.promotionId,
          customerId: s.customerId,
          paymentMethod: s.paymentMethod.toLowerCase(),
          timestamp: s.timestamp,
        })),
        summary: {
          totalRevenue: totalRevenue._sum.finalAmount || 0,
          totalProfit: totalProfit._sum.profit || 0,
          totalTransactions: total,
          averageOrderValue: parseFloat(avgOrder.toFixed(2)),
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async createSale(createSaleDto: any, user: any) {
    const { storeId, items, customerId, paymentMethod, discount = 0, promotionId } = createSaleDto;

    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new BadRequestException({
          code: 'RESOURCE_NOT_FOUND',
          message: `Product ${item.productId} not found`,
        });
      }

      if (product.currentStock < item.quantity) {
        throw new BadRequestException({
          code: 'PRODUCT_OUT_OF_STOCK',
          message: `Insufficient stock for product ${product.name}`,
        });
      }

      const revenue = item.unitPrice * item.quantity;
      const cost = product.cost * item.quantity;

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        revenue,
        cost,
        profit: revenue - cost,
      });

      totalAmount += revenue;

      // Update stock
      await this.prisma.product.update({
        where: { id: item.productId },
        data: {
          currentStock: product.currentStock - item.quantity,
          status: (product.currentStock - item.quantity) > product.reorderLevel ? 'IN_STOCK' :
                  (product.currentStock - item.quantity) > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
        },
      });
    }

    const finalAmount = totalAmount - discount;
    const transactionId = `TXN-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-6)}`;

    const sale = await this.prisma.sale.create({
      data: {
        transactionId,
        storeId,
        customerId,
        totalAmount,
        discount,
        finalAmount,
        paymentMethod: paymentMethod.toUpperCase(),
        promotionId,
        items: {
          create: saleItems,
        },
      },
    });

    return {
      success: true,
      data: {
        transactionId: sale.transactionId,
        totalAmount: sale.totalAmount,
        discount: sale.discount,
        finalAmount: sale.finalAmount,
        timestamp: sale.timestamp,
      },
    };
  }

  async getAggregate(query: any, user: any) {
    const { startDate, endDate, storeId, groupBy = 'day' } = query;

    if (!startDate || !endDate) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'startDate and endDate are required',
      });
    }

    const where: any = {
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (storeId) where.storeId = storeId;

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by date
    const grouped: any = {};
    sales.forEach((sale) => {
      const date = sale.timestamp.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = {
          date,
          revenue: 0,
          profit: 0,
          orders: 0,
          avgOrderValue: 0,
        };
      }
      grouped[date].revenue += sale.finalAmount;
      grouped[date].profit += sale.items.reduce((sum, item) => sum + item.profit, 0);
      grouped[date].orders += 1;
    });

    const timeSeries = Object.values(grouped).map((g: any) => ({
      ...g,
      avgOrderValue: parseFloat((g.revenue / g.orders).toFixed(2)),
    }));

    // Get top products
    const topProducts = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      },
      _sum: {
        revenue: true,
        quantity: true,
        profit: true,
      },
      orderBy: {
        _sum: {
          revenue: 'desc',
        },
      },
      take: 5,
    });

    const productsWithNames = await Promise.all(
      topProducts.map(async (tp) => {
        const product = await this.prisma.product.findUnique({
          where: { id: tp.productId },
        });
        return {
          productId: tp.productId,
          productName: product?.name,
          productNameSi: product?.nameSi,
          revenue: tp._sum.revenue || 0,
          quantity: tp._sum.quantity || 0,
          profit: tp._sum.profit || 0,
        };
      })
    );

    return {
      success: true,
      data: {
        timeSeries,
        topProducts: productsWithNames,
      },
    };
  }
}
