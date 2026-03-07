import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AlertsService } from '../alerts/alerts.service';
import { AnalyticsService } from '../analytics/analytics.module';
import { ForecastsService } from '../forecasts/forecasts.module';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { PromotionsService } from '../promotions/promotions.service';
import { SalesService } from '../sales/sales.service';
import { StoresService } from '../stores/stores.service';
import { VoiceService } from '../voice/voice.service';
import { XaiService } from '../xai/xai.module';

@Controller()
export class RmqController {
  private readonly logger = new Logger(RmqController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly salesService: SalesService,
    private readonly alertsService: AlertsService,
    private readonly promotionsService: PromotionsService,
    private readonly inventoryService: InventoryService,
    private readonly storesService: StoresService,
    private readonly analyticsService: AnalyticsService,
    private readonly forecastsService: ForecastsService,
    private readonly xaiService: XaiService,
    private readonly voiceService: VoiceService,
  ) {}

  // ============ Products ============

  @MessagePattern('bi.get.products')
  async getProducts(@Payload() data: any) {
    this.logger.debug('RMQ: getProducts', data.query);
    try {
      return await this.productsService.getProducts(data.query || {}, data.user);
    } catch (error) {
      this.logger.error('getProducts failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.get.products.:productId')
  async getProduct(@Payload() data: any) {
    const productId = data.path?.split('/').pop() || data.params?.productId;
    this.logger.debug('RMQ: getProduct', productId);
    try {
      return await this.productsService.getProduct(productId);
    } catch (error) {
      this.logger.error('getProduct failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.products')
  async createProduct(@Payload() data: any) {
    this.logger.debug('RMQ: createProduct', data.body);
    try {
      return await this.productsService.createProduct(data.body, data.user);
    } catch (error) {
      this.logger.error('createProduct failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.patch.products.:productId')
  async updateProduct(@Payload() data: any) {
    const productId = data.path?.split('/').pop() || data.params?.productId;
    this.logger.debug('RMQ: updateProduct', productId);
    try {
      return await this.productsService.updateProduct(productId, data.body, data.user);
    } catch (error) {
      this.logger.error('updateProduct failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.delete.products.:productId')
  async deleteProduct(@Payload() data: any) {
    const productId = data.path?.split('/').pop() || data.params?.productId;
    this.logger.debug('RMQ: deleteProduct', productId);
    try {
      return await this.productsService.deleteProduct(productId, data.user);
    } catch (error) {
      this.logger.error('deleteProduct failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Sales ============

  @MessagePattern('bi.get.sales')
  async getSales(@Payload() data: any) {
    this.logger.debug('RMQ: getSales', data.query);
    try {
      return await this.salesService.getSales(data.query || {}, data.user);
    } catch (error) {
      this.logger.error('getSales failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.sales')
  async createSale(@Payload() data: any) {
    this.logger.debug('RMQ: createSale');
    try {
      return await this.salesService.createSale(data.body, data.user);
    } catch (error) {
      this.logger.error('createSale failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.get.sales.aggregate')
  async getSalesAggregate(@Payload() data: any) {
    this.logger.debug('RMQ: getSalesAggregate', data.query);
    try {
      return await this.salesService.getAggregate(data.query || {}, data.user);
    } catch (error) {
      this.logger.error('getSalesAggregate failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Alerts ============

  @MessagePattern('bi.get.alerts')
  async getAlerts(@Payload() data: any) {
    this.logger.debug('RMQ: getAlerts', data.query);
    try {
      return await this.alertsService.getAlerts(data.query || {});
    } catch (error) {
      this.logger.error('getAlerts failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.alerts.:alertId.accept')
  async acceptAlert(@Payload() data: any) {
    const pathParts = data.path?.split('/') || [];
    const alertId = pathParts[1] || data.params?.alertId;
    this.logger.debug('RMQ: acceptAlert', alertId);
    try {
      return await this.alertsService.acceptAlert(alertId, data.body);
    } catch (error) {
      this.logger.error('acceptAlert failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.alerts.auto-dismiss')
  async autoDismissAlerts(@Payload() data: any) {
    this.logger.debug('RMQ: autoDismissAlerts');
    try {
      return await this.alertsService.autoDismissResolvedAlerts();
    } catch (error) {
      this.logger.error('autoDismissAlerts failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.alerts.generate')
  async generateAlerts(@Payload() data: any) {
    const storeId = data.query?.storeId;
    this.logger.debug('RMQ: generateAlerts', storeId);
    try {
      return await this.alertsService.generateAlerts(storeId);
    } catch (error) {
      this.logger.error('generateAlerts failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Promotions ============

  @MessagePattern('bi.get.promotions')
  async getPromotions(@Payload() data: any) {
    this.logger.debug('RMQ: getPromotions', data.query);
    try {
      return await this.promotionsService.getPromotions(data.query || {});
    } catch (error) {
      this.logger.error('getPromotions failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.get.promotions.:promotionId')
  async getPromotion(@Payload() data: any) {
    const promotionId = data.path?.split('/').pop() || data.params?.promotionId;
    this.logger.debug('RMQ: getPromotion', promotionId);
    try {
      return await this.promotionsService.getPromotion(promotionId);
    } catch (error) {
      this.logger.error('getPromotion failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.promotions')
  async createPromotion(@Payload() data: any) {
    this.logger.debug('RMQ: createPromotion');
    try {
      return await this.promotionsService.createPromotion(data.body);
    } catch (error) {
      this.logger.error('createPromotion failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.patch.promotions.:promotionId')
  async updatePromotion(@Payload() data: any) {
    const promotionId = data.path?.split('/').pop() || data.params?.promotionId;
    this.logger.debug('RMQ: updatePromotion', promotionId);
    try {
      return await this.promotionsService.updatePromotion(promotionId, data.body);
    } catch (error) {
      this.logger.error('updatePromotion failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.delete.promotions.:promotionId')
  async deletePromotion(@Payload() data: any) {
    const promotionId = data.path?.split('/').pop() || data.params?.promotionId;
    this.logger.debug('RMQ: deletePromotion', promotionId);
    try {
      return await this.promotionsService.deletePromotion(promotionId);
    } catch (error) {
      this.logger.error('deletePromotion failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Inventory ============

  @MessagePattern('bi.get.inventory.status')
  async getInventoryStatus(@Payload() data: any) {
    this.logger.debug('RMQ: getInventoryStatus', data.query);
    try {
      return await this.inventoryService.getStatus(data.query || {});
    } catch (error) {
      this.logger.error('getInventoryStatus failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.post.inventory.restock')
  async restockInventory(@Payload() data: any) {
    this.logger.debug('RMQ: restockInventory');
    try {
      return await this.inventoryService.restock(data.body);
    } catch (error) {
      this.logger.error('restockInventory failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Stores ============

  @MessagePattern('bi.get.stores')
  async getStores(@Payload() data: any) {
    this.logger.debug('RMQ: getStores', data.query);
    try {
      return await this.storesService.getStores(data.query || {});
    } catch (error) {
      this.logger.error('getStores failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Analytics ============

  @MessagePattern('bi.get.analytics.dashboard')
  async getDashboard(@Payload() data: any) {
    this.logger.debug('RMQ: getDashboard', data.query);
    try {
      return await this.analyticsService.getDashboard(data.query || {});
    } catch (error) {
      this.logger.error('getDashboard failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Forecasts ============

  @MessagePattern('bi.get.forecasts')
  async getForecasts(@Payload() data: any) {
    this.logger.debug('RMQ: getForecasts', data.query);
    try {
      return await this.forecastsService.getForecasts(data.query || {});
    } catch (error) {
      this.logger.error('getForecasts failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ XAI (Explainable AI) ============

  @MessagePattern('bi.get.xai.explain.forecast')
  async explainForecast(@Payload() data: any) {
    this.logger.debug('RMQ: explainForecast', data.query);
    try {
      return await this.xaiService.explainForecast(data.query || {});
    } catch (error) {
      this.logger.error('explainForecast failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  @MessagePattern('bi.get.xai.explain.restock')
  async explainRestock(@Payload() data: any) {
    const alertId = data.query?.alertId;
    const lang = data.query?.lang || 'en';
    this.logger.debug('RMQ: explainRestock', alertId);
    try {
      return await this.xaiService.explainRestock(alertId, lang);
    } catch (error) {
      this.logger.error('explainRestock failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }

  // ============ Voice ============

  @MessagePattern('bi.post.voice.query')
  async processVoiceQuery(@Payload() data: any) {
    this.logger.debug('RMQ: processVoiceQuery');
    try {
      return await this.voiceService.processTextQuery(data.body || {});
    } catch (error) {
      this.logger.error('processVoiceQuery failed:', error.message, error.stack);
      return { statusCode: 500, success: false, error: error.message };
    }
  }
}