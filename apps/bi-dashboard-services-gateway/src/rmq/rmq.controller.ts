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

/**
 * RabbitMQ Message Handler
 *
 * Handles all incoming RabbitMQ messages from the API Gateway and routes
 * them to the appropriate service methods.
 */
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
    return this.productsService.getProducts(data.query || {}, data.user);
  }

  @MessagePattern('bi.get.products.:productId')
  async getProduct(@Payload() data: any) {
    const productId = data.path?.split('/').pop() || data.params?.productId;
    this.logger.debug('RMQ: getProduct', productId);
    return this.productsService.getProduct(productId);
  }

  @MessagePattern('bi.post.products')
  async createProduct(@Payload() data: any) {
    this.logger.debug('RMQ: createProduct', data.body);
    return this.productsService.createProduct(data.body, data.user);
  }

  @MessagePattern('bi.patch.products.:productId')
  async updateProduct(@Payload() data: any) {
    const productId = data.path?.split('/').pop() || data.params?.productId;
    this.logger.debug('RMQ: updateProduct', productId);
    return this.productsService.updateProduct(productId, data.body, data.user);
  }

  @MessagePattern('bi.delete.products.:productId')
  async deleteProduct(@Payload() data: any) {
    const productId = data.path?.split('/').pop() || data.params?.productId;
    this.logger.debug('RMQ: deleteProduct', productId);
    return this.productsService.deleteProduct(productId, data.user);
  }

  // ============ Sales ============

  @MessagePattern('bi.get.sales')
  async getSales(@Payload() data: any) {
    this.logger.debug('RMQ: getSales', data.query);
    return this.salesService.getSales(data.query || {}, data.user);
  }

  @MessagePattern('bi.post.sales')
  async createSale(@Payload() data: any) {
    this.logger.debug('RMQ: createSale');
    return this.salesService.createSale(data.body, data.user);
  }

  @MessagePattern('bi.get.sales.aggregate')
  async getSalesAggregate(@Payload() data: any) {
    this.logger.debug('RMQ: getSalesAggregate', data.query);
    return this.salesService.getAggregate(data.query || {}, data.user);
  }

  // ============ Alerts ============

  @MessagePattern('bi.get.alerts')
  async getAlerts(@Payload() data: any) {
    this.logger.debug('RMQ: getAlerts', data.query);
    return this.alertsService.getAlerts(data.query || {});
  }

  @MessagePattern('bi.post.alerts.:alertId.accept')
  async acceptAlert(@Payload() data: any) {
    const pathParts = data.path?.split('/') || [];
    const alertId = pathParts[1] || data.params?.alertId;
    this.logger.debug('RMQ: acceptAlert', alertId);
    return this.alertsService.acceptAlert(alertId, data.body);
  }

  @MessagePattern('bi.post.alerts.auto-dismiss')
  async autoDismissAlerts(@Payload() data: any) {
    this.logger.debug('RMQ: autoDismissAlerts');
    return this.alertsService.autoDismissResolvedAlerts();
  }

  @MessagePattern('bi.post.alerts.generate')
  async generateAlerts(@Payload() data: any) {
    const storeId = data.query?.storeId;
    this.logger.debug('RMQ: generateAlerts', storeId);
    return this.alertsService.generateAlerts(storeId);
  }

  // ============ Promotions ============

  @MessagePattern('bi.get.promotions')
  async getPromotions(@Payload() data: any) {
    this.logger.debug('RMQ: getPromotions', data.query);
    return this.promotionsService.getPromotions(data.query || {});
  }

  @MessagePattern('bi.get.promotions.:promotionId')
  async getPromotion(@Payload() data: any) {
    const promotionId = data.path?.split('/').pop() || data.params?.promotionId;
    this.logger.debug('RMQ: getPromotion', promotionId);
    return this.promotionsService.getPromotion(promotionId);
  }

  @MessagePattern('bi.post.promotions')
  async createPromotion(@Payload() data: any) {
    this.logger.debug('RMQ: createPromotion');
    return this.promotionsService.createPromotion(data.body);
  }

  @MessagePattern('bi.patch.promotions.:promotionId')
  async updatePromotion(@Payload() data: any) {
    const promotionId = data.path?.split('/').pop() || data.params?.promotionId;
    this.logger.debug('RMQ: updatePromotion', promotionId);
    return this.promotionsService.updatePromotion(promotionId, data.body);
  }

  @MessagePattern('bi.delete.promotions.:promotionId')
  async deletePromotion(@Payload() data: any) {
    const promotionId = data.path?.split('/').pop() || data.params?.promotionId;
    this.logger.debug('RMQ: deletePromotion', promotionId);
    return this.promotionsService.deletePromotion(promotionId);
  }

  // ============ Inventory ============

  @MessagePattern('bi.get.inventory.status')
  async getInventoryStatus(@Payload() data: any) {
    this.logger.debug('RMQ: getInventoryStatus', data.query);
    return this.inventoryService.getStatus(data.query || {});
  }

  @MessagePattern('bi.post.inventory.restock')
  async restockInventory(@Payload() data: any) {
    this.logger.debug('RMQ: restockInventory');
    return this.inventoryService.restock(data.body);
  }

  // ============ Stores ============

  @MessagePattern('bi.get.stores')
  async getStores(@Payload() data: any) {
    this.logger.debug('RMQ: getStores', data.query);
    return this.storesService.getStores(data.query || {});
  }

  // ============ Analytics ============

  @MessagePattern('bi.get.analytics.dashboard')
  async getDashboard(@Payload() data: any) {
    this.logger.debug('RMQ: getDashboard', data.query);
    return this.analyticsService.getDashboard(data.query || {});
  }

  // ============ Forecasts ============

  @MessagePattern('bi.get.forecasts')
  async getForecasts(@Payload() data: any) {
    this.logger.debug('RMQ: getForecasts', data.query);
    return this.forecastsService.getForecasts(data.query || {});
  }

  // ============ XAI (Explainable AI) ============

  @MessagePattern('bi.get.xai.explain.forecast')
  async explainForecast(@Payload() data: any) {
    this.logger.debug('RMQ: explainForecast', data.query);
    return this.xaiService.explainForecast(data.query || {});
  }

  @MessagePattern('bi.get.xai.explain.restock')
  async explainRestock(@Payload() data: any) {
    const alertId = data.query?.alertId;
    const lang = data.query?.lang || 'en';
    this.logger.debug('RMQ: explainRestock', alertId);
    return this.xaiService.explainRestock(alertId, lang);
  }

  // ============ Voice ============

  @MessagePattern('bi.post.voice.query')
  async processVoiceQuery(@Payload() data: any) {
    this.logger.debug('RMQ: processVoiceQuery');
    return this.voiceService.processTextQuery(data.body || {});
  }
}
