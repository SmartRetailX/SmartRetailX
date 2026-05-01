import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { normalizeCatalogQuery, type VoiceChatResponseDto, type VoiceChatTcpPayload } from '@smart-retail-x/shared-types';
import { Pool } from 'pg';

import {
  type VoiceCapability,
  type VoiceCapabilityContext,
  type VoiceCapabilityMode,
} from './voice-capability.interface';

export type ActivePromotionItem = {
  promotionId?: string;
  productId?: string;
  productName?: string;
  discountPercentage?: number;
  promotionType?: string;
  targetedPromotion?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  offerStatus?: 'active' | 'upcoming' | 'expired';
};

type ActivePromotionRow = {
  promotionId: string;
  productId: string;
  productName: string | null;
  discountPercentage: number | string | null;
  promotionType: string | null;
  targetedPromotion: boolean | null;
  startDate: string | null;
  endDate: string | null;
  offerStatus: 'active' | 'upcoming' | 'expired';
};

@Injectable()
export class VoiceOfferService implements VoiceCapability, OnModuleDestroy {
  private readonly logger = new Logger(VoiceOfferService.name);
  private readonly pool: Pool;

  readonly id = 'offer';
  readonly priority = 30;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.databaseUrl,
      min: this.configService.databasePoolMin,
      max: this.configService.databasePoolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    });

    this.pool.on('error', (error) => {
      this.logger.error(`PostgreSQL pool error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async handle(context: VoiceCapabilityContext, _mode: VoiceCapabilityMode): Promise<VoiceChatResponseDto | null> {
    const queryText = context.transcriptText?.trim();
    if (!queryText || (context.intent !== 'offers' && !this.isOfferStyleQuestion(queryText))) {
      return null;
    }

    const offerResponse = await this.tryBuildOfferResponse(queryText, context.language, context.sessionId, context.explainability);
    if (offerResponse) {
      return offerResponse;
    }

    return this.buildOfferFallbackResponse(queryText, context.language, context.sessionId);
  }

  isOfferStyleQuestion(text: string | undefined): boolean {
    const normalized = normalizeCatalogQuery(text || '');
    if (!normalized) {
      return false;
    }

    const offerTerms = [
      'offer',
      'offers',
      'promo',
      'promos',
      'promotion',
      'promotions',
      'discount',
      'sale',
      'sales',
      'deals',
      'special price',
      'coupon',
      'coupons',
      'current offers',
      'current promotions',
      'promotion list',
      'discount items',
      'වට්ටම්',
      'ප්රවර්ධන',
      'ප්‍රවර්ධන',
      'ප්‍රොමෝ',
      'ප්රොමෝ',
      'දීමනා',
      'offer එක',
      'offers තියෙනවද',
      'ඔෆර්',
      'ඔෆර්ස්',
      'ඔෆර් එක',
      'ඔෆර්ස් තියෙනවද',
      'ඔපර්',
      'ඔපර්ස්',
      'ඔපර් එක',
      'ඔපර්ස් තියෙනවද',
      'ඔෆස්',
      'ඔෆස් තියෙනවද',
    ];

    if (offerTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    // Handle noisy Sinhala transcription variants like "ඔපර්ස්", "ඔෆස්".
    const offerPatterns = [
      /\boffer?s?\b/,
      /\bpromo(?:s|tion|tions)?\b/,
      /\bdiscounts?\b/,
      /\bdeals?\b/,
      /\bcoupons?\b/,
      /\bsales?\b/,
      /ඔ[ෆප](?:ර්|ර)?(?:ස්)?/,
      /වට්ටම්/,
      /ප්.?රවර්ධන/,
      /දීමනා/,
    ];

    return offerPatterns.some((pattern) => pattern.test(normalized));
  }

  private async tryBuildOfferResponse(
    transcriptText: string,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
    upstreamExplainability?: VoiceChatResponseDto['explainability'],
  ): Promise<VoiceChatResponseDto | null> {
    const promotions = await this.fetchOfferCandidates(5);
    if (!promotions) {
      return null;
    }

    const requestedProductHints = this.extractRequestedProductHints(transcriptText);
    const scopedPromotions =
      requestedProductHints.length > 0 ? this.filterPromotionsByRequestedProduct(promotions, requestedProductHints) : promotions;

    if (scopedPromotions.length === 0) {
      if (requestedProductHints.length > 0) {
        return {
          success: true,
          transcription: transcriptText,
          response: 'ඔබ සඳහන් කළ භාණ්ඩය සඳහා දැනට offer හමු නොවුණා.',
          language,
          sessionId,
          messages: [],
          intent: 'offers',
          explainability: upstreamExplainability,
          model: 'db-offers-no-match',
        };
      }

      return {
        success: true,
        transcription: transcriptText,
        response:
          'දැනට active promotions කිසිවක් නොපෙන්වයි. ටික වේලාවකට පසු නැවත පරීක්ෂා කරන්න.',
        language,
        sessionId,
        messages: [],
        intent: 'offers',
        explainability: upstreamExplainability ?? {
          source: 'db-offers',
          confidence: 0.9,
          rationale: 'Offer intent matched and active/upcoming/expired promotions were checked in the database.',
          features: [],
        },
        model: 'db-offers-empty',
      };
    }

    return {
      success: true,
      transcription: transcriptText,
      response: this.buildOfferListResponse(scopedPromotions),
      language,
      sessionId,
      messages: [],
      intent: 'offers',
      explainability: upstreamExplainability ?? {
        source: 'db-offers',
        confidence: 0.95,
        rationale: 'Offer intent matched and promotions were retrieved from database-backed promotion tables.',
        features: scopedPromotions.slice(0, 5).map((promotion) => ({
          name: promotion.productName || promotion.productId || 'promotion',
          weight: promotion.offerStatus === 'active' ? 1 : 0.7,
          evidence: `${promotion.offerStatus || 'unknown'} ${this.formatDiscount(promotion.discountPercentage)}`,
        })),
      },
      model: 'db-offers',
    };
  }

  private extractRequestedProductHints(text: string): string[] {
    const normalized = normalizeCatalogQuery(text);
    if (!normalized) {
      return [];
    }

    const stopwords = new Set([
      'offer',
      'offers',
      'promo',
      'promos',
      'promotion',
      'promotions',
      'discount',
      'sale',
      'sales',
      'deals',
      'special',
      'price',
      'current',
      'list',
      'වට්ටම්',
      'ප්රවර්ධන',
      'ප්‍රවර්ධන',
      'දීමනා',
      'ඔෆර්',
      'ඔෆර්ස්',
      'ඔපර්',
      'ඔපර්ස්',
      'තියෙනවද',
      'තියෙනව',
      'මොනවද',
      'මොනවාද',
      'ද',
    ]);

    return normalized
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !stopwords.has(token));
  }

  private filterPromotionsByRequestedProduct(
    promotions: ActivePromotionItem[],
    requestedProductHints: string[],
  ): ActivePromotionItem[] {
    return promotions.filter((promotion) => {
      const haystack = normalizeCatalogQuery([promotion.productName || '', promotion.productId || ''].join(' '));
      return requestedProductHints.every((hint) => haystack.includes(hint));
    });
  }

  private async fetchOfferCandidates(limit: number): Promise<ActivePromotionItem[] | null> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 10)) : 5;
    const sqlCandidates = [
      `
      SELECT
        p.promotion_id::text AS "promotionId",
        p.product_id::text AS "productId",
        COALESCE(pr.name_si, pr.name)::text AS "productName",
        p.discount_percentage AS "discountPercentage",
        p.promotion_type::text AS "promotionType",
        p.targeted_promotion AS "targetedPromotion",
        p.start_date::text AS "startDate",
        p.end_date::text AS "endDate",
        CASE
          WHEN p.start_date IS NOT NULL AND p.start_date > CURRENT_DATE THEN 'upcoming'
          WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'expired'
          ELSE 'active'
        END::text AS "offerStatus"
      FROM pe_promotions p
      LEFT JOIN core.products pr
        ON p.product_id::text = COALESCE(pr.sku, pr.id::text)
      ORDER BY
        CASE
          WHEN (p.start_date IS NULL OR p.start_date <= CURRENT_DATE)
           AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE) THEN 0
          WHEN p.start_date IS NOT NULL AND p.start_date > CURRENT_DATE THEN 1
          ELSE 2
        END,
        p.end_date ASC NULLS LAST,
        p.start_date ASC NULLS LAST,
        p.discount_percentage DESC NULLS LAST
      LIMIT $1
      `,
      `
      SELECT
        p.id::text AS "promotionId",
        pp.product_id::text AS "productId",
        COALESCE(pr.name_si, pr.name, pp.product_id::text)::text AS "productName",
        p.discount AS "discountPercentage",
        p.status::text AS "promotionType",
        FALSE AS "targetedPromotion",
        p.start_date::text AS "startDate",
        p.end_date::text AS "endDate",
        CASE
          WHEN p.start_date > CURRENT_DATE THEN 'upcoming'
          WHEN p.end_date < CURRENT_DATE THEN 'expired'
          ELSE 'active'
        END::text AS "offerStatus"
      FROM bi_dashboard.promotions p
      LEFT JOIN bi_dashboard.promotion_products pp ON pp.promotion_id = p.id
      LEFT JOIN core.products pr ON pr.id::text = pp.product_id::text
      ORDER BY
        CASE
          WHEN p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE THEN 0
          WHEN p.start_date > CURRENT_DATE THEN 1
          ELSE 2
        END,
        p.end_date ASC NULLS LAST,
        p.start_date ASC NULLS LAST,
        p.discount DESC NULLS LAST
      LIMIT $1
      `,
      `
      SELECT
        p.id::text AS "promotionId",
        ''::text AS "productId",
        COALESCE(p.name_si, p.name)::text AS "productName",
        p.discount AS "discountPercentage",
        p.status::text AS "promotionType",
        FALSE AS "targetedPromotion",
        p.start_date::text AS "startDate",
        p.end_date::text AS "endDate",
        CASE
          WHEN p.start_date > CURRENT_DATE THEN 'upcoming'
          WHEN p.end_date < CURRENT_DATE THEN 'expired'
          ELSE 'active'
        END::text AS "offerStatus"
      FROM bi_dashboard.promotions p
      ORDER BY
        CASE
          WHEN p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE THEN 0
          WHEN p.start_date > CURRENT_DATE THEN 1
          ELSE 2
        END,
        p.end_date ASC NULLS LAST,
        p.start_date ASC NULLS LAST,
        p.discount DESC NULLS LAST
      LIMIT $1
      `,
    ];

    for (const sql of sqlCandidates) {
      try {
        const query = await this.pool.query<ActivePromotionRow>(sql, [safeLimit]);
        return this.mapOfferRows(query.rows);
      } catch (error) {
        this.logger.warn(`Offers lookup candidate failed (${error?.message ?? error})`);
      }
    }

    return null;
  }

  private mapOfferRows(rows: ActivePromotionRow[]): ActivePromotionItem[] {
    return rows.map((row) => {
      const numericDiscount = Number(row.discountPercentage);

      return {
        promotionId: row.promotionId,
        productId: row.productId,
        productName: row.productName || row.productId,
        discountPercentage: Number.isFinite(numericDiscount) ? numericDiscount : undefined,
        promotionType: row.promotionType || undefined,
        targetedPromotion: Boolean(row.targetedPromotion),
        startDate: row.startDate,
        endDate: row.endDate,
        offerStatus: row.offerStatus,
      } satisfies ActivePromotionItem;
    });
  }

  async getOfferCandidates(limit = 5): Promise<ActivePromotionItem[] | null> {
    return await this.fetchOfferCandidates(limit);
  }

  private buildOfferListResponse(promotions: ActivePromotionItem[]): string {
    const topPromotions = promotions.slice(0, 5);
    const active = topPromotions.filter((promotion) => promotion.offerStatus === 'active');
    const upcoming = topPromotions.filter((promotion) => promotion.offerStatus === 'upcoming');
    const expired = topPromotions.filter((promotion) => promotion.offerStatus === 'expired');

    const sections: string[] = [];

    if (active.length > 0) {
      sections.push('### දැනට පවතින Offers', this.buildOfferTable(active));
    }

    if (upcoming.length > 0) {
      sections.push('### ඉදිරියේ එන Offers', this.buildOfferTable(upcoming));
    }

    if (expired.length > 0) {
      if (active.length === 0 && upcoming.length === 0) {
        sections.push('_දැනට active offers නැහැ_');
      }
      sections.push('### අවසන් වූ Offers', this.buildOfferTable(expired));
    }

    if (sections.length === 0) {
      return '_දැනට active promotions කිසිවක් නොපෙන්වයි._';
    }

    return sections.join('\n\n');
  }

  private buildOfferTable(promotions: ActivePromotionItem[]): string {
    const rows = promotions.map((promotion, index) => {
      const product = (promotion.productName || promotion.productId || 'Unknown product').trim();
      const discount = this.formatDiscount(promotion.discountPercentage);
      const validity = this.formatDateRange(promotion.startDate, promotion.endDate);
      const type = promotion.promotionType || '-';
      const targeted = promotion.targetedPromotion ? 'ඔව්' : '-';

      return [
        `| ${index + 1}`,
        this.formatMarkdownCell(product),
        this.formatMarkdownCell(discount),
        this.formatMarkdownCell(type),
        targeted,
        this.formatMarkdownCell(validity || '-'),
      ].join(' | ') + ' |';
    });

    return [
      '| # | භාණ්ඩය | වට්ටම | වර්ගය | Targeted | වලංගු කාලය |',
      '| ---: | --- | ---: | --- | --- | --- |',
      ...rows,
    ].join('\n');
  }

  private formatDiscount(discountPercentage: number | undefined): string {
    if (typeof discountPercentage !== 'number' || Number.isNaN(discountPercentage)) {
      return 'Discount info unavailable';
    }

    const rounded = Number(discountPercentage.toFixed(2));
    return Number.isInteger(rounded) ? `${rounded}% OFF` : `${rounded.toFixed(2)}% OFF`;
  }

  private formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);

    if (!start && !end) {
      return '';
    }

    if (start && end) {
      return `${start} - ${end}`;
    }

    return `valid until ${end || start}`;
  }

  private formatDate(dateValue: string | null | undefined): string {
    if (!dateValue) {
      return '';
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().slice(0, 10);
  }

  private formatMarkdownCell(value: string): string {
    return value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim() || '-';
  }

  buildOfferFallbackResponse(
    transcriptText: string | undefined,
    language: VoiceChatTcpPayload['language'],
    sessionId: string,
  ): VoiceChatResponseDto | null {
    const queryText = transcriptText?.trim();
    if (!this.isOfferStyleQuestion(queryText)) {
      return null;
    }

    return {
      success: true,
      transcription: queryText || '',
      response:
        'දැනට offers සේවාවට සම්බන්ධතාවයේ ගැටලුවක් තිබෙනවා. මොහොතකින් නැවත උත්සාහ කරන්න.',
      language,
      sessionId,
      messages: [],
      intent: 'offers',
      model: 'offer-fallback',
    };
  }
}
