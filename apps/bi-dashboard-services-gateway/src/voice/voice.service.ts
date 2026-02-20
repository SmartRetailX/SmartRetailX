import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoiceService {
  constructor(private prisma: PrismaService) {}

  async processTextQuery(queryDto: any) {
    const { query, language = 'en' } = queryDto;

    // Simple intent detection (in production, use NLP service)
    let intent = 'unknown';
    let entities: any = {};
    let response = '';
    let responseSi = '';
    const data: any = {};

    if (query.toLowerCase().includes('restock') || query.toLowerCase().includes('low stock')) {
      intent = 'query_inventory';
      entities = { action: 'restock', status: 'low_stock' };

      // Get low stock products
      const products = await this.prisma.product.findMany({
        where: {
          OR: [{ status: 'LOW_STOCK' }, { status: 'OUT_OF_STOCK' }],
        },
        take: 10,
      });

      response = `You have ${products.length} products that need restocking across all stores.`;
      responseSi = `සියලුම වෙළඳසැල් හරහා නැවත තොග කිරීම අවශ්‍ය නිෂ්පාදන ${products.length} ක් ඔබට ඇත.`;

      data.products = products.map((p) => ({
        id: p.id,
        name: p.name,
        nameSi: p.nameSi,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        status: p.status,
      }));
    } else if (query.toLowerCase().includes('sales') || query.toLowerCase().includes('revenue')) {
      intent = 'query_sales';

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sales = await this.prisma.sale.findMany({
        where: {
          timestamp: { gte: today },
        },
      });

      const totalRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);

      response = `Today's sales: ${sales.length} orders with total revenue of LKR ${totalRevenue.toFixed(2)}.`;
      responseSi = `අද විකුණුම්: ඇණවුම් ${sales.length} ක් සමග LKR ${totalRevenue.toFixed(2)} ක මුළු ආදායමක්.`;

      data.sales = {
        orderCount: sales.length,
        totalRevenue,
        date: today.toISOString().split('T')[0],
      };
    } else {
      response = 'I didn\'t understand that. Try asking about "restocking" or "sales".';
      responseSi = 'මට එය තේරුණේ නැත. "නැවත තොග කිරීම" හෝ "විකුණුම්" ගැන විමසන්න.';
    }

    return {
      success: true,
      data: {
        intent,
        entities,
        response,
        responseSi,
        data,
      },
    };
  }
}
