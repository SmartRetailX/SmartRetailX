import { Controller, Get, Post, Patch, Body, Query, Param, Req, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Proxies requests to the Python FastAPI Promotion Engine ML service.
 * All /api/promotion-engine/* requests are forwarded to PROMOTION_ENGINE_URL.
 */
@Controller('promotion-engine')
export class PromotionEngineController {
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('PROMOTION_ENGINE_URL') ||
      'http://localhost:8000';
  }

  @Get('health')
  async health() {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.json();
    } catch {
      return { status: 'unavailable', models_loaded: false };
    }
  }

  @Get('products')
  async listProducts(@Query('category') category?: string, @Query('limit') limit?: string) {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (limit) params.set('limit', limit);
      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`${this.baseUrl}/api/products${qs}`);
      return res.json();
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Get('products/categories')
  async listCategories() {
    try {
      const res = await fetch(`${this.baseUrl}/api/products/categories`);
      return res.json();
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Post('campaigns/generate')
  async generateCampaign(@Body() body: any) {
    try {
      const res = await fetch(`${this.baseUrl}/api/campaigns/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Campaign generation failed' };
      }
      return data;
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Get('campaigns')
  async listCampaigns(@Query('limit') limit?: string) {
    try {
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${this.baseUrl}/api/campaigns${qs}`);
      return res.json();
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Get('campaigns/:id')
  async getCampaign(@Param('id') id: string) {
    try {
      const upstream = await fetch(`${this.baseUrl}/api/campaigns/${id}`);
      const data = await upstream.json();
      if (!upstream.ok) {
        throw new HttpException(data, upstream.status);
      }
      return data;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Get('products/:productId/bundles')
  async getProductBundles(
    @Param('productId') productId: string,
    @Query('min_support') minSupport?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const params = new URLSearchParams();
      if (minSupport) params.set('min_support', minSupport);
      if (limit) params.set('limit', limit);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${this.baseUrl}/api/products/${productId}/bundles${qs}`);
      return res.json();
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Post('campaigns/compare')
  async compareCampaigns(@Body() body: any) {
    try {
      const res = await fetch(`${this.baseUrl}/api/campaigns/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Comparison failed' };
      }
      return data;
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  // ── Customer promotion inbox ────────────────────────────────────────────
  // These endpoints are auth-protected (global guard). The authenticated
  // user's email is forwarded to the Python service which resolves the
  // pe_customers.customer_id via email match — no user-table migration needed.

  /** Must come before /:id/read so NestJS doesn't treat 'read-all' as an id. */
  @Patch('my-promotions/read-all')
  async markAllPromotionsRead(
    @Req() req: Request & { user?: { email?: string } },
  ) {
    const email = req.user?.email;
    if (!email) return { success: false, marked: 0 };
    try {
      const params = new URLSearchParams({ email });
      const res = await fetch(
        `${this.baseUrl}/api/customer-promotions/read-all?${params.toString()}`,
        { method: 'PATCH' },
      );
      return res.json();
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  @Get('my-promotions')
  async getMyPromotions(
    @Req() req: Request & { user?: { email?: string } },
  ) {
    const email = req.user?.email;
    // If somehow email is missing after auth guard, return empty inbox gracefully
    // (do NOT throw 401 — that would trigger the client-side logout redirect)
    if (!email) {
      return { success: true, promotions: [], total: 0, unread: 0 };
    }
    try {
      const params = new URLSearchParams({ email });
      const res = await fetch(
        `${this.baseUrl}/api/customer-promotions?${params.toString()}`,
      );
      const data = await res.json();
      return data;
    } catch {
      // ML service is unreachable — return a distinguishable error payload
      return { success: false, promotions: null, total: 0, unread: 0, error: 'ML service is not running' };
    }
  }

  @Patch('my-promotions/:id/read')
  async markPromotionRead(
    @Param('id') id: string,
    @Req() req: Request & { user?: { email?: string } },
  ) {
    const email = req.user?.email;
    if (!email) return { success: false };
    try {
      const params = new URLSearchParams({ email });
      const res = await fetch(
        `${this.baseUrl}/api/customer-promotions/${id}/read?${params.toString()}`,
        { method: 'PATCH' },
      );
      return res.json();
    } catch {
      return { success: false, error: 'ML service is not running' };
    }
  }

  // ── Customer product suggestions (co-purchase recommendations) ────────────

  @Get('product-suggestions')
  async getProductSuggestions(
    @Req() req: Request & { user?: { email?: string } },
    @Query('limit') limit?: string,
  ) {
    const email = req.user?.email;
    if (!email) {
      return { success: true, customer_found: false, customer_products_count: 0, suggestions: [], total: 0 };
    }
    try {
      const params = new URLSearchParams({ email });
      if (limit) params.set('limit', limit);
      const res = await fetch(
        `${this.baseUrl}/api/product-suggestions?${params.toString()}`,
      );
      const data = await res.json();
      return data;
    } catch {
      return { success: false, suggestions: null, total: 0, error: 'ML service is not running' };
    }
  }
}
