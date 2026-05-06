import { HttpModule, HttpService } from '@nestjs/axios';
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@smart-retail-x/config';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
class ForecastsService {
  private mlServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8019');
  }

  private async resolveMlProductId(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id: productId }, { sku: productId }],
      },
      select: {
        id: true,
        sku: true,
        name: true,
      },
    });

    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return {
      requestedProductId: productId,
      mlProductId: product.sku,
      product,
    };
  }

  /**
   * Get forecasts for a product.
   * 
   * Calls ML service at POST /api/v1/forecast with:
   *   { productId, horizon, lang }
   * 
   * Response contains forecasts[], drivers[], and metadata.
   */
  async getForecasts(query: any) {
    const { productId, horizon = 30, lang = 'en' } = query;

    if (!productId) {
      throw new HttpException(
        'productId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const resolved = await this.resolveMlProductId(productId);
      console.log(
        `[FORECAST] Requesting forecast for product=${resolved.requestedProductId} ` +
        `(mlProductId=${resolved.mlProductId}), horizon=${horizon}, lang=${lang}`,
      );

      // Call Python ML service
      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/forecast`, {
          productId: resolved.mlProductId,
          horizon: Number(horizon),
          lang,
        }),
      );

      const mlData = {
        ...response.data.data,
        productId: resolved.requestedProductId,
        mlProductId: resolved.mlProductId,
      };

      // Save forecasts to database for caching / historical tracking
      await this.saveForecastsToDb(
        resolved.requestedProductId,
        mlData.forecasts,
        mlData.modelType,
        mlData.confidence,
      );

      // Save drivers to database for later reference
      if (mlData.drivers && mlData.drivers.length > 0) {
        await this.saveDriversToDb(resolved.requestedProductId, mlData.drivers);
      }

      console.log(
        `[FORECAST] ✅ Forecast generated for ${resolved.requestedProductId} ` +
        `via ${resolved.mlProductId}: ${mlData.forecasts.length} days`,
      );

      return {
        success: true,
        data: mlData,
      };
    } catch (error) {
      console.error(`[FORECAST] ❌ ML Service error: ${error.message}`);

      // Fallback: Try to get cached forecasts from database
      const cachedForecasts = await this.getCachedForecasts(productId, horizon);
      if (cachedForecasts) {
        console.log(`[FORECAST] ⚠️  Using cached forecasts (ML service unavailable)`);
        return { success: true, data: cachedForecasts, cached: true };
      }

      throw new HttpException(
        `Failed to generate forecast: ${error.message}. ML service unavailable.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Explain forecast predictions using SHAP.
   * 
   * Calls ML service at POST /api/v1/explain/forecast with:
   *   { productId, date, lang }
   */
  async explainForecast(query: any) {
    const { productId, date, lang = 'en' } = query;

    if (!productId) {
      throw new HttpException('productId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const resolved = await this.resolveMlProductId(productId);
      console.log(
        `[XAI-FORECAST] Explaining forecast for product=${resolved.requestedProductId} ` +
        `(mlProductId=${resolved.mlProductId}), date=${date}, lang=${lang}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/explain/forecast`, {
          productId: resolved.mlProductId,
          date,
          lang,
        }),
      );

      console.log(`[XAI-FORECAST] ✅ Explanation generated`);

      return response.data;
    } catch (error) {
      console.error(`[XAI-FORECAST] ❌ Error: ${error.message}`);
      throw new HttpException(
        `Failed to explain forecast: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async saveForecastsToDb(
    productId: string,
    forecasts: any[],
    modelType: string,
    confidence: number,
  ) {
    try {
      // Delete old forecasts for this product (replace with latest)
      await this.prisma.forecast.deleteMany({
        where: { productId },
      });

      // Insert new forecasts
      const forecastRecords = forecasts.map((f) => ({
        productId,
        date: new Date(f.date),
        predictedSales: f.predictedSales,
        confidenceLower: f.confidenceLower,
        confidenceUpper: f.confidenceUpper,
        revenue: f.revenue,
        modelType,
        confidence,
      }));

      await this.prisma.forecast.createMany({
        data: forecastRecords,
        skipDuplicates: true,
      });

      console.log(`[DB] Saved ${forecastRecords.length} forecasts for product ${productId}`);
    } catch (dbError) {
      console.error(`[DB] Warning: Failed to save forecasts: ${dbError.message}`);
      // Don't throw — let the API response succeed even if DB save fails
    }
  }

  private async saveDriversToDb(productId: string, drivers: any[]) {
    try {
      // Delete old drivers for this product
      await this.prisma.forecastDriver.deleteMany({
        where: { productId },
      });

      // Insert new drivers
      const driverRecords = drivers.map((d) => ({
        productId,
        name: d.name,
        nameSi: d.nameSi,
        impact: d.impact,
        description: d.description,
        descriptionSi: d.descriptionSi,
      }));

      await this.prisma.forecastDriver.createMany({
        data: driverRecords,
      });

      console.log(`[DB] Saved ${driverRecords.length} drivers for product ${productId}`);
    } catch (dbError) {
      console.error(`[DB] Warning: Failed to save drivers: ${dbError.message}`);
      // Don't throw — let the API response succeed even if DB save fails
    }
  }

  private async getCachedForecasts(productId: string, horizon: number) {
    try {
      const forecasts = await this.prisma.forecast.findMany({
        where: { productId },
        take: Number(horizon),
        orderBy: { date: 'asc' },
      });

      if (forecasts.length === 0) return null;

      const drivers = await this.prisma.forecastDriver.findMany({
        where: { productId },
        orderBy: { impact: 'desc' },
      });

      return {
        productId,
        modelType: forecasts[0]?.modelType || 'Prophet',
        confidence: forecasts[0]?.confidence || 0.87,
        generatedAt: forecasts[0]?.generatedAt?.toISOString(),
        forecasts: forecasts.map((f) => ({
          date: f.date.toISOString().split('T')[0],
          predictedSales: f.predictedSales,
          confidenceLower: f.confidenceLower,
          confidenceUpper: f.confidenceUpper,
          revenue: f.revenue,
        })),
        drivers: drivers.map((d) => ({
          name: d.name,
          nameSi: d.nameSi,
          impact: d.impact,
          description: d.description,
          descriptionSi: d.descriptionSi,
        })),
      };
    } catch (dbError) {
      console.error(`[DB] Error fetching cached forecasts: ${dbError.message}`);
      return null;
    }
  }
}

@ApiTags('Forecasts')
@Controller('forecasts')
@ApiBearerAuth('JWT-auth')
class ForecastsController {
  constructor(private forecastsService: ForecastsService) { }

  @Get()
  @ApiOperation({
    summary: 'Get AI sales forecasts',
    description:
      'Retrieve 30-day sales forecasts powered by Prophet + XGBoost ML models with confidence intervals and feature importance drivers. Includes bilingual explanations (English & Sinhala).',
  })
  @ApiQuery({
    name: 'productId',
    required: true,
    type: String,
    description: 'Product SKU (e.g., "P001") or database UUID. Must match a trained model.',
    example: 'P001',
  })
  @ApiQuery({
    name: 'horizon',
    required: false,
    type: Number,
    description: 'Forecast horizon in days (1-365, default: 30)',
    example: 30,
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language: "en" (English) or "si" (Sinhala)',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Forecasts retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          productId: 'P001',
          productName: 'Widget A',
          category: 'Electronics',
          modelType: 'Prophet',
          confidence: 0.87,
          generatedAt: '2025-05-04T12:34:56.789012',
          forecasts: [
            {
              date: '2025-05-05',
              predictedSales: 45.32,
              confidenceLower: 12.15,
              confidenceUpper: 78.49,
              revenue: 453.20,
            },
            {
              date: '2025-05-06',
              predictedSales: 52.18,
              confidenceLower: 18.92,
              confidenceUpper: 85.44,
              revenue: 521.80,
            },
          ],
          drivers: [
            {
              name: 'Promotions & Holidays',
              nameSi: 'ප්‍රවර්ධන සහ නිවාඩු',
              impact: 0.35,
              description: 'Sales increase by 35% during promotions',
              descriptionSi: 'ප්‍රවර්ධන වලදී විකුණුම් 35% වැඩි වේ',
            },
            {
              name: 'Seasonal Patterns',
              nameSi: 'කාලීය රටා',
              impact: 0.28,
              description: 'Summer has highest sales, Winter lowest',
              descriptionSi: 'ගිsummer අවධියේ ඉහළම විකුණුම්',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Missing productId' })
  @ApiResponse({ status: 503, description: 'ML service unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getForecasts(@Query() query) {
    return this.forecastsService.getForecasts(query);
  }

  @Get('explain')
  @ApiOperation({
    summary: 'Get SHAP explanations for forecast predictions',
    description:
      'Retrieve Explainable AI (XAI) feature importance using SHAP. Shows how each feature (day of week, promotions, weather, inventory, etc.) contributes to the forecast value. Bilingual output.',
  })
  @ApiQuery({
    name: 'productId',
    required: true,
    type: String,
    description: 'Product SKU or database UUID',
    example: 'P001',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Target date (ISO format: YYYY-MM-DD). Default: today.',
    example: '2025-05-15',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language: "en" or "si"',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'SHAP explanation retrieved',
    schema: {
      example: {
        success: true,
        data: {
          productId: 'P001',
          productName: 'Widget A',
          modelType: 'XGBoost',
          targetDate: '2025-05-15',
          explanation: {
            en: 'Prediction is 12.5 units above baseline, driven by Weekend effect and High discount',
            si: 'අනුමාන මූලික මතට ඉහළ ඒකක 12.5...',
          },
          metrics: {
            baselineDemand: 35.2,
            predictedDemand: 47.7,
            confidence: 0.82,
          },
          features: [
            {
              name: 'Day of Week Effect',
              nameSi: 'සතියේ දින බලපෑම',
              value: 5.0,
              impact: 3.2,
              direction: 'increase',
              importance: 0.95,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'ML service unavailable' })
  async explainForecast(@Query() query) {
    return this.forecastsService.explainForecast(query);
  }
}

@Module({
  imports: [HttpModule],
  controllers: [ForecastsController],
  providers: [ForecastsService],
  exports: [ForecastsService],
})
export class ForecastsModule { }

export { ForecastsService };