import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';
import { normalizeCatalogQuery, type VoiceChatResponseDto, type VoiceChatTcpPayload } from '@smart-retail-x/shared-types';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

import {
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';
import { VoiceProductService } from './voice-product.service';
import {
  type OrderDetail,
  type OrderDetailResponse,
  type OrderListItem,
  type OrderListResponse,
} from './voice.types';

@Injectable()
export class VoiceOrderService implements VoiceCapability {
  private readonly logger = new Logger(VoiceOrderService.name);
  readonly id = 'order';
  readonly priority = 20;

  constructor(
    @Inject('CORE_SERVICE') private readonly coreClient: ClientProxy,
    private readonly configService: ConfigService,
    private readonly voiceProductService: VoiceProductService,
  ) {}

  async handle(context: VoiceCapabilityContext, mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null> {
    if (mode !== 'primary' && mode !== 'fallback') {
      return null;
    }

    return await this.tryOrderAwareResponse(context.transcriptText, context.language, context.sessionId, context.userId);
  }

  async tryOrderAwareResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    userId: string,
  ): Promise<VoiceChatResponseDto | null> {
    const queryText = transcriptText?.trim();
    if (!queryText) {
      return null;
    }

    if (!this.isOrderStyleQuestion(queryText)) {
      return null;
    }

    const responseText = await this.buildOrderResponse(queryText, userId);
    if (!responseText) {
      return null;
    }

    return {
      success: true,
      transcription: queryText,
      response: responseText,
      language,
      sessionId,
      messages: [],
      model: 'core-order-history',
    };
  }

  private async buildOrderResponse(queryText: string, userId: string): Promise<string | null> {
    const orderNumber = this.extractOrderNumber(queryText);
    if (orderNumber !== null) {
      const specificOrder = await this.fetchOrderByNumber(userId, orderNumber);
      if (!specificOrder) {
        return `Order number ${orderNumber} සම්බන්ධ දත්ත හමු නොවුණා.`;
      }

      return this.formatOrderDetail(specificOrder);
    }

    if (this.isAllOrdersQuestion(queryText) && !this.isLatestOrderQuestion(queryText)) {
      return await this.buildAllOrdersResponse(userId);
    }

    const order = await this.fetchLatestOrder(userId);

    if (!order) {
      const latestSummary = await this.fetchLatestOrderSummary(userId);
      if (latestSummary) {
        return this.formatLatestOrderSummary(latestSummary);
      }

      return 'ඔබගේ ඇණවුම් ඉතිහාසයේ දත්ත හමු නොවුණා. පළමුව ඇණවුමක් place කළ පසු විස්තර ලබා දෙන්න පුළුවන්.';
    }

    return this.formatOrderDetail(order);
  }

  private async buildAllOrdersResponse(userId: string): Promise<string> {
    const { orders, total } = await this.fetchAllOrders(userId, 30);
    if (!orders.length) {
      return 'ඔබගේ ඇණවුම් ඉතිහාසයේ දත්ත හමු නොවුණා. පළමුව ඇණවුමක් place කළ පසු විස්තර ලබා දෙන්න පුළුවන්.';
    }

    const lines = orders.map((order, index) => {
      return [
        `${index + 1}) ${order.orderNumber}`,
        `   දිනය: ${this.formatDate(order.createdAt)}`,
        `   තත්වය: ${this.formatOrderStatus(order.status)}`,
        `   මුළු මුදල: ${this.voiceProductService.formatPrice(order.total)}`,
        `   භාණ්ඩ: ${order.itemCount}`,
      ].join('\n');
    });

    const hiddenCount = Math.max(0, total - orders.length);
    const footer =
      hiddenCount > 0
        ? `_තවත් ${hiddenCount} ඇණවුම් ඇත. Specific order number එක කියලා එය විස්තරාත්මකව බලන්න පුළුවන්._`
        : '_Specific order number එකක් කියලා ඒකේ විස්තර පෙන්වන්න පුළුවන්._';

    return [
      '**ඔබගේ ඇණවුම් විස්තර**',
      `මුළු ඇණවුම් ගණන: ${total}`,
      `පෙන්වන්නේ: ${orders.length}`,
      '',
      ...lines,
      '',
      footer,
    ].join('\n');
  }

  private async fetchLatestOrder(userId: string): Promise<OrderDetail | null> {
    const list = await this.fetchOrders(userId, 1, 1);
    const latest = list?.data?.orders?.[0];
    if (!latest?.id) {
      return null;
    }

    return await this.fetchOrderById(userId, latest.id);
  }

  async getLatestOrderForUser(userId: string): Promise<OrderDetail | null> {
    return await this.fetchLatestOrder(userId);
  }

  async getRecentOrdersForUser(userId: string, maxOrders = 3): Promise<OrderDetail[]> {
    const safeMax = Number.isFinite(maxOrders) ? Math.max(1, Math.min(Math.floor(maxOrders), 10)) : 3;
    const { orders } = await this.fetchAllOrders(userId, safeMax);
    if (!orders.length) {
      return [];
    }

    const details = await Promise.all(orders.map((order) => this.fetchOrderById(userId, order.id)));
    return details.filter((detail): detail is OrderDetail => Boolean(detail));
  }

  private async fetchLatestOrderSummary(userId: string): Promise<OrderListItem | null> {
    const list = await this.fetchOrders(userId, 1, 1);
    return list?.data?.orders?.[0] ?? null;
  }

  private async fetchOrderById(userId: string, orderId: string): Promise<OrderDetail | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_ORDER_TIMEOUT_MS', 3_000));
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'order_get' }, { userId, orderId }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false } satisfies OrderDetailResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as OrderDetailResponse;

      if (!result?.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      this.logger.warn(`Order detail lookup failed (${error?.message ?? error})`);
      return null;
    }
  }

  private async fetchOrderByNumber(userId: string, orderNumber: string): Promise<OrderDetail | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_ORDER_TIMEOUT_MS', 3_000));
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'order_get_by_number' }, { userId, orderNumber }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false } satisfies OrderDetailResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as OrderDetailResponse;

      if (!result?.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      this.logger.warn(`Order number lookup failed (${error?.message ?? error})`);
      return null;
    }
  }

  private async fetchAllOrders(userId: string, maxOrders = 30): Promise<{ orders: OrderListItem[]; total: number }> {
    const pageLimit = 10;
    const collected: OrderListItem[] = [];
    let page = 1;
    let total = 0;
    let totalPages = 1;

    while (page <= totalPages && collected.length < maxOrders) {
      const response = await this.fetchOrders(userId, pageLimit, page);
      if (!response?.success) {
        break;
      }

      const pageOrders = response.data?.orders ?? [];
      const pagination = response.data?.pagination;
      total = Number(pagination?.total ?? total);
      totalPages = Number(pagination?.totalPages ?? totalPages);

      if (!pageOrders.length) {
        break;
      }

      collected.push(...pageOrders);
      page += 1;
    }

    return {
      orders: collected.slice(0, maxOrders),
      total: total || collected.length,
    };
  }

  private async fetchOrders(userId: string, limit = 5, page = 1): Promise<OrderListResponse | null> {
    try {
      const timeoutMs = Number(this.configService.get<string | number>('CORE_ORDER_TIMEOUT_MS', 3_000));
      const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
      const result = (await firstValueFrom(
        this.coreClient.send({ cmd: 'order_list' }, { userId, page: safePage, limit }).pipe(
          timeout(timeoutMs),
          defaultIfEmpty({ success: false } satisfies OrderListResponse),
          catchError((error) => {
            throw error;
          }),
        ),
      )) as OrderListResponse;

      return result;
    } catch (error) {
      this.logger.warn(`Order list lookup failed (${error?.message ?? error})`);
      return null;
    }
  }

  private formatOrderDetail(order: OrderDetail): string {
    const createdAt = this.formatDate(order.createdAt);
    const items = (order.items || []).slice(0, 5).map((item, index) => {
      const itemName = (item.productNameSi || item.productName || '').trim() || 'නම නොමැති නිෂ්පාදනය';
      return [
        `${index + 1}) ${itemName}`,
        `   ප්‍රමාණය: ${item.quantity}`,
        `   මුදල: ${this.voiceProductService.formatPrice(item.totalPrice)}`,
      ].join('\n');
    });

    return [
      '**අවසන් ඇණවුමේ විස්තර**',
      `Order No: ${order.orderNumber}`,
      `දිනය: ${createdAt}`,
      `තත්වය: ${this.formatOrderStatus(order.status)}`,
      `මුළු මුදල: ${this.voiceProductService.formatPrice(order.total)}`,
      `භාණ්ඩ ගණන: ${order.itemCount}`,
      '',
      '**අයිතම**',
      ...(items.length > 0 ? items : ['අයිතම නොමැත']),
    ].join('\n');
  }

  private formatLatestOrderSummary(order: OrderListItem): string {
    return [
      '**අවසන් ඇණවුමේ සාරාංශය**',
      `Order No: ${order.orderNumber}`,
      `දිනය: ${this.formatDate(order.createdAt)}`,
      `තත්වය: ${this.formatOrderStatus(order.status)}`,
      `මුළු මුදල: ${this.voiceProductService.formatPrice(order.total)}`,
      `භාණ්ඩ ගණන: ${order.itemCount}`,
      '',
      '_අයිතම විස්තර ලබා ගැනීමට order number එක සඳහන් කර අහන්න._',
    ].join('\n');
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatOrderStatus(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'confirmed') return 'Confirmed';
    if (normalized === 'processing') return 'Processing';
    if (normalized === 'shipped') return 'Shipped';
    if (normalized === 'delivered') return 'Delivered';
    if (normalized === 'cancelled') return 'Cancelled';
    return status || 'Unknown';
  }

  private isOrderStyleQuestion(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
    if (!normalized) {
      return false;
    }

    if (this.extractOrderNumber(normalized)) {
      return true;
    }

    const orderTerms = [
      'order',
      'orders',
      'order history',
      'order status',
      'order detail',
      'order details',
      'last order',
      'latest order',
      'recent order',
      'track order',
      'tracking order',
      'my order',
      'my orders',
      'purchase history',
      'latest purchase',
      'recent purchase',
      'previous purchase',
      'past purchase',
      'purchases',
      'ඇණවුම',
      'ඇණවුම්',
      'ඇනවුම',
      'ඇනවුම්',
      'පෙර ඇණවුම්',
      'අවසාන ඇණවුම',
      'අලුත්ම ඇණවුම',
      'අන්තිම ඇණවුම',
      'ඇණවුම් ඉතිහාස',
      'පෙර මිලදී ගැනීම්',
      'මගේ මිලදී ගැනීම්',
      'මිලදී ගත්',
      'ඔර්ඩර්',
      'ඔර්ඩර්ස්',
      'ඕඩර්',
      'ඕඩර්ස්',
      'ඔඩර්',
      'ඔඩර්ස්',
      'ඕඩර',
      'ඕඩරස්',
      'ඔඩර',
      'ඔඩරස්',
    ];

    if (orderTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    const orderPatterns = [
      /\border(s)?\b/u,
      /\b(last|latest|recent)\s+order(s)?\b/u,
      /\border\s*(history|status|details?|tracking)\b/u,
      /ඇණ?වුම්?/u,
      /[ඔඕ]ර්?ඩ[ර්ර]?[ස්s]?/u,
      /[ඔඕ]ඩ[ර්ර]?[ස්s]?/u,
    ];

    return orderPatterns.some((pattern) => pattern.test(normalized));
  }

  private isLatestOrderQuestion(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
    if (!normalized) {
      return false;
    }

    const explicitLatestTerms = [
      'last order',
      'latest order',
      'recent order',
      'my last order',
      'my latest order',
      'අවසාන ඇණවුම',
      'අලුත්ම ඇණවුම',
      'අන්තිම ඇණවුම',
      'පසුගිය ඇණවුම',
    ];

    if (explicitLatestTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    const latestQualifiers = ['last', 'latest', 'recent', 'අවසාන', 'අලුත්ම', 'අන්තිම', 'පසුගිය'];
    const orderHints = ['order', 'orders', 'ඇණවුම', 'ඔර්ඩර්', 'ඕඩර්', 'ඔඩර්', 'ඕඩර', 'ඔඩර'];

    return latestQualifiers.some((term) => normalized.includes(term)) && orderHints.some((term) => normalized.includes(term));
  }

  private isAllOrdersQuestion(text: string): boolean {
    const normalized = normalizeCatalogQuery(text);
    if (!normalized) {
      return false;
    }

    const explicitAllTerms = [
      'all orders',
      'all my orders',
      'all of my orders',
      'order list',
      'orders list',
      'order history',
      'orders history',
      'purchase history',
      'මගේ සියලුම ඔර්ඩර්',
      'සියලුම ඔර්ඩර්',
      'සියලු ඔර්ඩර්',
      'මගේ ඔක්කොම ඔර්ඩර්',
      'ඔක්කොම ඔර්ඩර්',
      'සියලුම ඇණවුම්',
      'සියලු ඇණවුම්',
      'මගේ ඔක්කොම ඇණවුම්',
      'ඔක්කොම ඇණවුම්',
      'ඇණවුම් ලැයිස්තුව',
      'ඇණවුම් ඉතිහාස',
      'මගේ සියලුම ඇණවුම්',
      'පෙර ඇණවුම්',
      'පෙර මිලදී ගැනීම්',
      'මගේ මිලදී ගැනීම්',
    ];

    if (explicitAllTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    const allQualifiers = ['all', 'every', 'සියලු', 'සියලුම', 'සියල්ල', 'මුලු', 'මුළු', 'සෑම', 'ඔක්කොම'];
    const orderHints = ['order', 'orders', 'ඇණවුම', 'ඇණවුම්', 'ඔර්ඩර්', 'ඔර්ඩර්ස්', 'ඕඩර්', 'ඕඩර්ස්'];
    const listHints = ['history', 'list', 'details', 'summary', 'ඉතිහාස', 'ලැයිස්තුව', 'විස්තර'];
    const pluralOrderHints = ['orders', 'ඇණවුම්', 'ඔර්ඩර්ස්', 'ඕඩර්ස්', 'ඔඩර්ස්', 'ඕඩරස්', 'ඔඩරස්'];

    const hasOrder = orderHints.some((term) => normalized.includes(term));
    const hasAll = allQualifiers.some((term) => normalized.includes(term));
    const hasListIntent = listHints.some((term) => normalized.includes(term));
    const hasPluralOrder = pluralOrderHints.some((term) => normalized.includes(term));

    return (hasOrder && hasAll) || (hasPluralOrder && hasListIntent);
  }

  private extractOrderNumber(text: string): string | null {
    const match = text.match(/(ORD[-\s]?\d{8}[-\s]?[A-Za-z0-9]{4,10})/i);
    if (!match?.[1]) {
      return null;
    }

    const compact = match[1].replace(/\s+/g, '').toUpperCase();
    const normalized = compact.includes('-')
      ? compact
      : compact.replace(/^ORD(\d{8})([A-Z0-9]{4,10})$/, 'ORD-$1-$2');

    return normalized;
  }
}
