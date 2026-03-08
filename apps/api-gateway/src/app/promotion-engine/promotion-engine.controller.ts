import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

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
    const res = await fetch(`${this.baseUrl}/health`);
    return res.json();
  }

  @Get('products')
  async listProducts(@Query('category') category?: string, @Query('limit') limit?: string) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (limit) params.set('limit', limit);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${this.baseUrl}/api/products${qs}`);
    return res.json();
  }

  @Get('products/categories')
  async listCategories() {
    const res = await fetch(`${this.baseUrl}/api/products/categories`);
    return res.json();
  }

  @Post('campaigns/generate')
  async generateCampaign(@Body() body: any) {
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
  }
}
