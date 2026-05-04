import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';

function toDateKey(value: Date) {
  return value.toISOString().split('T')[0];
}

function buildDateSeries(start: Date, end: Date, values: Map<string, { revenue: number; orders: number }>) {
  const series: Array<{ date: string; revenue: number; orders: number }> = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dateKey = toDateKey(cursor);
    const current = values.get(dateKey) ?? { revenue: 0, orders: 0 };

    series.push({
      date: dateKey,
      revenue: current.revenue,
      orders: current.orders,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}

function calculateChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function calculateTrend(current: number, previous: number) {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}

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
    const previousSince = new Date(since.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const [currentSalesSummary, previousSalesSummary, forecastConfidenceSummary] = await Promise.all([
      this.prisma.$queryRaw<{ revenue: number; orders: number }[]>`
        SELECT
          COALESCE(SUM(final_amount), 0)::float8 AS revenue,
          COUNT(*)::int AS orders
        FROM bi_dashboard.sales
        WHERE timestamp >= ${since}
      `,
      this.prisma.$queryRaw<{ revenue: number; orders: number }[]>`
        SELECT
          COALESCE(SUM(final_amount), 0)::float8 AS revenue,
          COUNT(*)::int AS orders
        FROM bi_dashboard.sales
        WHERE timestamp >= ${previousSince}
          AND timestamp < ${since}
      `,
      this.prisma.$queryRaw<{ confidence: number }[]>`
        SELECT COALESCE(AVG(confidence), 0)::float8 AS confidence
        FROM bi_dashboard.sales_forecasts
        WHERE generated_at >= ${since}
      `,
    ]);

    const currentRevenue = Number(currentSalesSummary[0]?.revenue || 0);
    const currentOrders = Number(currentSalesSummary[0]?.orders || 0);
    const previousRevenue = Number(previousSalesSummary[0]?.revenue || 0);
    const previousOrders = Number(previousSalesSummary[0]?.orders || 0);
    const forecastConfidence = Number(forecastConfidenceSummary[0]?.confidence || 0);

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
    const salesTrend = buildDateSeries(
      since,
      new Date(),
      new Map(
        salesTrendRaw.map((r) => [
          r.date,
          {
            revenue: Number(r.revenue),
            orders: Number(r.orders),
          },
        ]),
      ),
    );

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
          totalRevenue: {
            value: currentRevenue,
            change: calculateChange(currentRevenue, previousRevenue),
            trend: calculateTrend(currentRevenue, previousRevenue),
          },
          totalOrders: {
            value: currentOrders,
            change: calculateChange(currentOrders, previousOrders),
            trend: calculateTrend(currentOrders, previousOrders),
          },
          activeAlerts: { value: activeAlertsCount, change: 0, trend: 'stable' },
          criticalAlerts: { value: criticalAlertsCount, change: 0, trend: 'stable' },
          forecastAccuracy: { value: forecastConfidence, change: 0, trend: 'stable' },
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
            forecastAccuracy: { value: 94.2, change: 2.1, trend: 'up' },
            customerRetention: { value: 87.5, change: 3.2, trend: 'up' },
            inventoryTurnover: { value: 6.2, change: 5.1, trend: 'up' },
          },
          topProducts: [
            {
              id: 'PROD001',
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
