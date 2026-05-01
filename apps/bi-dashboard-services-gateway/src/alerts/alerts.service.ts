import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import axios from 'axios';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);
  private mlServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  async onModuleInit() {
    // Wait for ML service to be ready before generating alerts on startup
    setTimeout(async () => {
      try {
        this.logger.log('Auto-generating alerts on startup...');
        await this.generateAlerts();
        this.logger.log('Startup alert generation complete.');
      } catch (error) {
        this.logger.warn(`Startup alert generation failed (will retry on next manual trigger): ${error.message}`);
      }
    }, 10000); // 10s delay to allow ML service to start
  }

  async getAlerts(query: any) {
    const { type, urgency, status } = query;
    const where: any = {
      status: 'PENDING', // Default: only show pending alerts
    };

    if (type && type !== 'undefined') where.type = type.toUpperCase();
    if (urgency && urgency !== 'undefined') where.urgency = urgency.toUpperCase();
    if (status && status !== 'undefined') where.status = status.toUpperCase(); // Allow override

    const alerts = await this.prisma.alert.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            nameSi: true,
            currentStock: true,
          },
        },
      },
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      data: {
        alerts: alerts.map((a) => ({
          id: a.id,
          type: a.type.toLowerCase(),
          urgency: a.urgency.toLowerCase(),
          productId: a.productId,
          productName: a.product?.name,
          productNameSi: a.product?.nameSi,
          currentStock: a.currentStock,
          recommendedQuantity: a.recommendedQuantity,
          reason: a.reason,
          reasonSi: a.reasonSi,
          confidence: a.confidence,
          estimatedStockoutDate: a.estimatedStockoutDate?.toISOString().split('T')[0],
          status: a.status.toLowerCase(),
          createdAt: a.createdAt,
        })),
      },
    };
  }

  async acceptAlert(alertId: string, acceptDto: any) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    const purchaseOrderId = 'po_' + Date.now();

    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        purchaseOrderId,
      },
    });

    return {
      success: true,
      data: {
        alertId,
        status: 'accepted',
        purchaseOrderId,
        acceptedAt: new Date(),
      },
    };
  }

  /**
   * Generate alerts by calling ML service to analyze inventory
   * This syncs AI-generated alerts into the database
   */
  async generateAlerts() {
    try {
      console.log('🤖 Calling ML service to generate alerts...');

      // Call ML service to analyze inventory and generate alerts
      const url = `${this.mlServiceUrl}/api/v1/alerts/generate`;
      const response = await axios.post(url);

      const { alerts, alertsGenerated } = response.data.data;

      console.log(`📊 ML service generated ${alertsGenerated} alerts`);

      // Get all currently active product combos from new alerts
      const activeProducts = new Set(alerts.map((a) => a.productId));

      // Auto-dismiss old PENDING alerts that are no longer critical
      const dismissedAlerts = await this.prisma.alert.updateMany({
        where: {
          status: 'PENDING',
          // Dismiss if not in the new alert batch
          NOT: {
            OR: alerts.map((a) => ({
              productId: a.productId,
            })),
          },
        },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: 'Auto-dismissed: Alert no longer in latest ML critical set',
        },
      });

      if (dismissedAlerts.count > 0) {
        console.log(`  🗑️  Auto-dismissed ${dismissedAlerts.count} resolved alerts`);
      }

      // Sync alerts to database
      const savedAlerts = [];
      for (const alertData of alerts) {
        // Check if alert already exists for this product
        const existing = await this.prisma.alert.findFirst({
          where: {
            productId: alertData.productId,
            status: 'PENDING',
          },
        });

        if (existing) {
          // Update existing alert
          const updated = await this.prisma.alert.update({
            where: { id: existing.id },
            data: {
              urgency: alertData.urgency,
              currentStock: alertData.currentStock,
              recommendedQuantity: alertData.recommendedQuantity,
              reason: alertData.reason,
              reasonSi: alertData.reasonSi,
              confidence: alertData.confidence,
              estimatedStockoutDate: new Date(alertData.estimatedStockoutDate),
            },
          });
          savedAlerts.push(updated);
          console.log(`  ✏️  Updated alert: ${updated.id} for ${alertData.productId}`);
        } else {
          // Create new alert
          const created = await this.prisma.alert.create({
            data: {
              type: alertData.type,
              urgency: alertData.urgency,
              productId: alertData.productId,
              currentStock: alertData.currentStock,
              recommendedQuantity: alertData.recommendedQuantity,
              reason: alertData.reason,
              reasonSi: alertData.reasonSi,
              confidence: alertData.confidence,
              estimatedStockoutDate: new Date(alertData.estimatedStockoutDate),
              status: 'PENDING',
            },
          });
          savedAlerts.push(created);
          console.log(`  ➕ Created alert: ${created.id} for ${alertData.productId}`);
        }
      }

      return {
        success: true,
        data: {
          alertsGenerated: savedAlerts.length,
          alerts: savedAlerts.map((a) => ({
            id: a.id,
            type: a.type,
            urgency: a.urgency,
            productId: a.productId,
            currentStock: a.currentStock,
            recommendedQuantity: a.recommendedQuantity,
            reason: a.reason,
          })),
        },
      };
    } catch (error) {
      console.error('❌ Error generating alerts:', error.message);
      throw new HttpException(
        `Failed to generate alerts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Auto-dismiss alerts for products that are back in stock
   */
  async autoDismissResolvedAlerts() {
    try {
      // Find pending restock alerts
      const pendingAlerts = await this.prisma.alert.findMany({
        where: {
          type: 'RESTOCK',
          status: 'PENDING',
        },
        include: {
          product: true,
        },
      });

      let dismissedCount = 0;
      for (const alert of pendingAlerts) {
        // Check if product is now above reorder level
        if (alert.product && alert.product.currentStock >= alert.product.reorderLevel) {
          await this.prisma.alert.update({
            where: { id: alert.id },
            data: {
              status: 'REJECTED',
              rejectedAt: new Date(),
              rejectionReason: 'Auto-dismissed: Stock level restored above reorder point',
            },
          });
          dismissedCount++;
          console.log(`  ✅ Auto-dismissed alert ${alert.id} - stock restored`);
        }
      }

      return {
        success: true,
        data: {
          dismissedCount,
          message: `Auto-dismissed ${dismissedCount} resolved alerts`,
        },
      };
    } catch (error) {
      console.error('❌ Error auto-dismissing alerts:', error.message);
      throw error;
    }
  }
}
