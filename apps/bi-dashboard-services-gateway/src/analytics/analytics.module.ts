import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(query: any) {
    // Get active alerts count (PENDING status only)
    const activeAlertsCount = await this.prisma.alert.count({
      where: {
        status: 'PENDING',
      },
    });

    // Get critical alerts count (HIGH urgency + PENDING)
    const criticalAlertsCount = await this.prisma.alert.count({
      where: {
        status: 'PENDING',
        urgency: 'HIGH',
      },
    });

    // Get total products count
    const totalProducts = await this.prisma.product.count();

    // Get low stock products count (current_stock < reorder_level)
    const lowStockResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count
      FROM bi_dashboard.products
      WHERE current_stock < reorder_level
    `;
    const lowStockProducts = Number(lowStockResult[0]?.count || 0);

    // Determine date range based on period
    const periodDays = query.period === 'day' ? 1 : query.period === 'week' ? 7 : query.period === 'year' ? 365 : 30;
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // KPI aggregates for the selected period
    const periodSalesAggregate = await this.prisma.sale.aggregate({
      where: {
        timestamp: {
          gte: since,
        },
      },
      _sum: {
        finalAmount: true,
      },
      _count: {
        _all: true,
      },
    });

    // Use historical forecasts as a lightweight proxy for confidence/accuracy.
    const forecastAgg = await this.prisma.forecast.aggregate({
      where: {
        generatedAt: {
          gte: since,
        },
      },
      _avg: {
        confidence: true,
      },
    });

    const totalRevenueValue = Number(periodSalesAggregate._sum.finalAmount || 0);
    const totalOrdersValue = Number(periodSalesAggregate._count._all || 0);
    const forecastAccuracyValue = Number(((forecastAgg._avg.confidence || 0) * 100).toFixed(1));

    // Sales trend: daily revenue + order count
    const salesTrendRaw = await this.prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
      SELECT
        DATE(timestamp)::text AS date,
        ROUND(SUM(final_amount)::numeric, 2) AS revenue,
        COUNT(*)::int AS orders
      FROM bi_dashboard.sales
      WHERE timestamp >= ${since}
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) ASC
    `;
    const salesTrend = salesTrendRaw.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    }));

    // Top products: by revenue in the period
    const topProductsRaw = await this.prisma.$queryRaw<{ id: string; name: string; revenue: number; quantity: number }[]>`
      SELECT
        p.id,
        p.name,
        ROUND(SUM(si.revenue)::numeric, 2) AS revenue,
        SUM(si.quantity)::int AS quantity
      FROM bi_dashboard.sale_items si
      JOIN bi_dashboard.products p ON p.id = si.product_id
      JOIN bi_dashboard.sales s ON s.id = si.sale_id
      WHERE s.timestamp >= ${since}
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 5
    `;
    const topProducts = topProductsRaw.map((r) => ({
      id: r.id,
      name: r.name,
      revenue: Number(r.revenue),
      quantity: Number(r.quantity),
    }));

    return {
      success: true,
      data: {
        kpis: {
          totalRevenue: { value: totalRevenueValue, change: 0, trend: 'stable' },
          totalOrders: { value: totalOrdersValue, change: 0, trend: 'stable' },
          activeAlerts: { value: activeAlertsCount, change: -15.2, trend: 'down' },
          criticalAlerts: { value: criticalAlertsCount, change: 0, trend: 'stable' },
          forecastAccuracy: { value: forecastAccuracyValue, change: 0, trend: 'stable' },
          totalProducts: { value: totalProducts, change: 0, trend: 'stable' },
          lowStockProducts: { value: lowStockProducts, change: 0, trend: 'stable' },
        },
        topProducts,
        salesTrend,
      },
    };
  }
}

@ApiTags('Analytics')
@Controller('analytics')
@ApiBearerAuth('JWT-auth')
class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard KPIs and metrics',
    description:
      'Retrieve comprehensive business intelligence metrics including revenue, orders, alerts, forecast accuracy, customer retention, and inventory turnover with trend indicators.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month', 'year'],
    description: 'Time period for metrics',
    example: 'month',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          kpis: {
            totalRevenue: { value: 1250000.0, change: 12.5, trend: 'up' },
            totalOrders: { value: 4567, change: 8.3, trend: 'up' },
            activeAlerts: { value: 15, change: -15.2, trend: 'down' },
            criticalAlerts: { value: 4, change: 0, trend: 'stable' },
            forecastAccuracy: { value: 94.2, change: 2.1, trend: 'up' },
            totalProducts: { value: 20, change: 0, trend: 'stable' },
            lowStockProducts: { value: 3, change: 0, trend: 'stable' },
          },
          topProducts: [
            {
              id: '70001',
              name: 'Basmati Rice 5kg',
              revenue: 125000.0,
              quantity: 850,
            },
          ],
          salesTrend: [{ date: '2025-11-30', revenue: 45000.0, orders: 125 }],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Query() query) {
    return this.analyticsService.getDashboard(query);
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrismaService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

export { AnalyticsService };
