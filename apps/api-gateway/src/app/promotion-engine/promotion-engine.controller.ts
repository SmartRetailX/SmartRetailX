import { Controller, Get, Post, Body, Query, Param, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
}
