import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import axios, { AxiosError } from 'axios';

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
    /**
     * Auto-generate alerts on startup after a delay.
     * Gives the ML service time to initialize.
     */
    setTimeout(async () => {
      try {
        this.logger.log('⏱️  Auto-generating alerts on startup (after 10s delay)...');
        await this.generateAlerts();
        this.logger.log('✅ Startup alert generation complete.');
      } catch (error) {
        this.logger.warn(
          `⚠️  Startup alert generation failed: ${error.message}. ` +
          `Will retry on next manual trigger. ML service may not be ready yet.`,
        );
      }
    }, 10000); // 10s delay to allow ML service to start
  }

  /**
   * Get alerts from database, optionally filtered by type/urgency/status.
   * 
   * Default: show only PENDING alerts.
   */
  async getAlerts(query: any) {
    const { type, urgency, status } = query;
    const where: any = {
      status: status ? status.toUpperCase() : 'PENDING',
    };

    if (type && type !== 'undefined') where.type = type.toUpperCase();
    if (urgency && urgency !== 'undefined') where.urgency = urgency.toUpperCase();

    try {
      const alerts = await this.prisma.alert.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              nameSi: true,
              currentStock: true,
              reorderLevel: true,
              price: true,
            },
          },
        },
        orderBy: [
          { urgency: 'desc' }, // HIGH first
          { createdAt: 'desc' }, // Newest first
        ],
      });

      return {
        success: true,
        data: {
          count: alerts.length,
          alerts: alerts.map((a) => ({
            id: a.id,
            type: a.type.toLowerCase(),
            urgency: a.urgency.toLowerCase(),
            productId: a.productId,
            productSku: a.product?.sku,
            productName: a.product?.name,
            productNameSi: a.product?.nameSi,
            currentStock: a.currentStock,
            recommendedQuantity: a.recommendedQuantity,
            reason: a.reason,
            reasonSi: a.reasonSi,
            confidence: a.confidence,
            estimatedStockoutDate: a.estimatedStockoutDate?.toISOString().split('T')[0],
            status: a.status.toLowerCase(),
            createdAt: a.createdAt.toISOString(),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching alerts: ${error.message}`);
      throw new HttpException(
        `Failed to fetch alerts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mark an alert as ACCEPTED and create a purchase order.
   */
  async acceptAlert(alertId: string, acceptDto: any = {}) {
    try {
      const alert = await this.prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
      }

      const purchaseOrderId = acceptDto.purchaseOrderId || `PO-${Date.now()}`;

      const updated = await this.prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          purchaseOrderId,
        },
      });

      this.logger.log(`✅ Alert ${alertId} accepted → PO ${purchaseOrderId}`);

      return {
        success: true,
        data: {
          alertId,
          status: 'accepted',
          purchaseOrderId,
          acceptedAt: updated.acceptedAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error accepting alert: ${error.message}`);
      throw new HttpException(
        `Failed to accept alert: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reject an alert (mark as REJECTED).
   */
  async rejectAlert(alertId: string, rejectDto: any = {}) {
    try {
      const alert = await this.prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
      }

      const updated = await this.prisma.alert.update({
        where: { id: alertId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: rejectDto.reason || 'Manual rejection',
        },
      });

      this.logger.log(`❌ Alert ${alertId} rejected`);

      return {
        success: true,
        data: {
          alertId,
          status: 'rejected',
          rejectionReason: updated.rejectionReason,
          rejectedAt: updated.rejectedAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error rejecting alert: ${error.message}`);
      throw new HttpException(
        `Failed to reject alert: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate alerts by calling the ML service.
   * 
   * Calls: POST /api/v1/alerts/generate
   * 
   * ML service analyzes all products and returns alerts with:
   *   - productId (SKU)
   *   - urgency (HIGH/MEDIUM/LOW)
   *   - currentStock
   *   - recommendedQuantity
   *   - reason (English & Sinhala)
   *   - confidence
   *   - estimatedStockoutDate
   */
  async generateAlerts() {
    try {
      this.logger.log('🤖 Calling ML service to generate alerts...');

      const url = `${this.mlServiceUrl}/api/v1/alerts/generate`;
      const response = await axios.post(url);
      const { alerts, alertsGenerated } = response.data.data;

      this.logger.log(`📊 ML service generated ${alertsGenerated} alerts`);

      // Auto-dismiss PENDING alerts that are no longer in the new batch
      // (assumes the product was restocked or no longer meets alert criteria)
      const activeProductIds = new Set(alerts.map((a) => a.productId));
      const activeProductIdList = Array.from(activeProductIds) as string[];

      const dismissedResult = await this.prisma.alert.updateMany({
        where: {
          status: 'PENDING',
          productId: {
            notIn: activeProductIdList,
          },
        },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Auto-dismissed: No longer in active alert batch',
          rejectedAt: new Date(),
        },
      });

      if (dismissedResult.count > 0) {
        this.logger.log(`🗑️  Auto-dismissed ${dismissedResult.count} resolved alerts`);
      }

      // Sync new alerts to database
      const savedAlerts = [];
      for (const alertData of alerts) {
        try {
          // Look up product by SKU
          const product = await this.prisma.product.findFirst({
            where: {
              OR: [
                { sku: alertData.productSku },
                { id: alertData.productId }, // fallback to UUID
              ],
            },
          });

          if (!product) {
            this.logger.warn(
              `⚠️  Product not found for alert: ${alertData.productSku} / ${alertData.productId}`,
            );
            continue; // Skip this alert — avoid FK violation
          }

          // Check if alert already exists for this product
          const existing = await this.prisma.alert.findFirst({
            where: {
              productId: product.id,
              status: 'PENDING',
            },
          });

          if (existing) {
            // Update existing PENDING alert
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
            this.logger.log(`✏️  Updated alert: ${updated.id} for ${alertData.productSku}`);
          } else {
            // Create new alert
            const created = await this.prisma.alert.create({
              data: {
                productId: product.id,
                type: alertData.type || 'RESTOCK',
                urgency: alertData.urgency,
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
            this.logger.log(`➕ Created alert: ${created.id} for ${alertData.productSku}`);
          }
        } catch (alertError) {
          this.logger.error(
            `❌ Error processing alert for ${alertData.productSku}: ${alertError.message}`,
          );
        }
      }

      return {
        success: true,
        data: {
          alertsGenerated: savedAlerts.length,
          alerts: savedAlerts.map((a) => ({
            id: a.id,
            productId: a.productId,
            type: a.type,
            urgency: a.urgency,
            currentStock: a.currentStock,
            recommendedQuantity: a.recommendedQuantity,
            reason: a.reason,
            confidence: a.confidence,
            estimatedStockoutDate: a.estimatedStockoutDate?.toISOString().split('T')[0],
          })),
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : error.message;

      this.logger.error(`❌ Error generating alerts: ${errorMsg}`);

      throw new HttpException(
        `Failed to generate alerts from ML service: ${error.message}. ` +
        `Ensure ML service is running at ${this.mlServiceUrl}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Analyze a single product for restock needs.
   * 
   * Calls: POST /api/v1/alerts/analyze-product
   * 
   * Returns alert if stock is insufficient, or "OK" status.
   */
  async analyzeProductAlert(productId: string) {
    try {
      this.logger.log(`🔍 Analyzing product for alert: ${productId}`);

      // Look up product SKU by database UUID
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      // Call ML service with product SKU
      const url = `${this.mlServiceUrl}/api/v1/alerts/analyze-product`;
      const response = await axios.post(url, {
        productId: product.sku, // Use SKU for ML model lookup
      });

      const result = response.data.data;

      if (result.alertNeeded) {
        const alertData = result.alert;

        // Upsert alert in database
        const existing = await this.prisma.alert.findFirst({
          where: {
            productId,
            status: 'PENDING',
          },
        });

        let alert;
        if (existing) {
          alert = await this.prisma.alert.update({
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
        } else {
          alert = await this.prisma.alert.create({
            data: {
              productId,
              type: alertData.type || 'RESTOCK',
              urgency: alertData.urgency,
              currentStock: alertData.currentStock,
              recommendedQuantity: alertData.recommendedQuantity,
              reason: alertData.reason,
              reasonSi: alertData.reasonSi,
              confidence: alertData.confidence,
              estimatedStockoutDate: new Date(alertData.estimatedStockoutDate),
              status: 'PENDING',
            },
          });
        }

        this.logger.log(`⚠️  Alert generated: ${alert.id} (${alertData.urgency})`);

        return {
          success: true,
          data: {
            alertNeeded: true,
            alert: {
              id: alert.id,
              productId: alert.productId,
              type: alert.type,
              urgency: alert.urgency,
              currentStock: alert.currentStock,
              recommendedQuantity: alert.recommendedQuantity,
              reason: alert.reason,
              reasonSi: alert.reasonSi,
              confidence: alert.confidence,
              estimatedStockoutDate: alert.estimatedStockoutDate?.toISOString().split('T')[0],
            },
          },
        };
      } else {
        // Auto-dismiss any existing PENDING alert for this product
        const existing = await this.prisma.alert.findFirst({
          where: {
            productId,
            status: 'PENDING',
          },
        });

        if (existing) {
          await this.prisma.alert.update({
            where: { id: existing.id },
            data: {
              status: 'REJECTED',
              rejectionReason: 'Auto-dismissed: Stock is now adequate',
              rejectedAt: new Date(),
            },
          });
          this.logger.log(`✅ Dismissed alert for ${product.sku}: Stock adequate`);
        }

        return {
          success: true,
          data: {
            alertNeeded: false,
            message: result.message || 'Stock adequate based on ML forecast',
          },
        };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new HttpException('Product not found in ML service', HttpStatus.NOT_FOUND);
      }
      this.logger.error(`Error analyzing product: ${error.message}`);
      throw new HttpException(
        `Failed to analyze product: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Auto-dismiss alerts for products that are back in stock.
   * Checks if product.currentStock >= product.reorderLevel.
   */
  async autoDismissResolvedAlerts() {
    try {
      this.logger.log('🔄 Auto-dismissing resolved alerts...');

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
        if (
          alert.product &&
          alert.product.currentStock >= alert.product.reorderLevel
        ) {
          await this.prisma.alert.update({
            where: { id: alert.id },
            data: {
              status: 'REJECTED',
              rejectionReason: 'Auto-dismissed: Stock level restored',
              rejectedAt: new Date(),
            },
          });
          dismissedCount++;
          this.logger.log(
            `✅ Auto-dismissed alert ${alert.id}: Stock restored for ${alert.product.sku}`,
          );
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
      this.logger.error(`Error auto-dismissing alerts: ${error.message}`);
      throw new HttpException(
        `Failed to auto-dismiss alerts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}