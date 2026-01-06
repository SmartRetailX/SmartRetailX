import { Module } from '@nestjs/common';
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
class ForecastsService {
  private mlServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }
  
  async getForecasts(query: any) {
    const { productId, storeId, horizon = 30, lang = 'en' } = query;
    
    try {
      // Call Python ML service for real predictions
      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/forecast`, {
          productId,
          storeId,
          horizon: Number(horizon),
          lang,
        })
      );
      
      const mlData = response.data.data;
      
      // Save forecasts to database
      await this.saveForecastsToDb(productId, storeId, mlData.forecasts, mlData.modelType, mlData.confidence);
      
      // Save drivers to database
      await this.saveDriversToDb(productId, storeId, mlData.drivers);
      
      return {
        success: true,
        data: mlData,
      };
    } catch (error) {
      console.error('ML Service error:', error.message);
      
      // Fallback: Try to get cached forecasts from database
      const cachedForecasts = await this.getCachedForecasts(productId, storeId, horizon);
      if (cachedForecasts) {
        return { success: true, data: cachedForecasts };
      }
      
      throw new HttpException(
        'Failed to generate forecast. ML service unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
  
  async saveForecastsToDb(productId: string, storeId: string, forecasts: any[], modelType: string, confidence: number) {
    // Delete old forecasts for this product/store
    await this.prisma.forecast.deleteMany({
      where: { productId, storeId },
    });
    
    // Insert new forecasts
    const forecastRecords = forecasts.map(f => ({
      productId,
      storeId,
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
  }
  
  async saveDriversToDb(productId: string, storeId: string, drivers: any[]) {
    // Delete old drivers
    await this.prisma.forecastDriver.deleteMany({
      where: { productId, storeId },
    });
    
    // Insert new drivers
    const driverRecords = drivers.map(d => ({
      productId,
      storeId,
      name: d.name,
      nameSi: d.nameSi,
      impact: d.impact,
      description: d.description,
      descriptionSi: d.descriptionSi,
    }));
    
    await this.prisma.forecastDriver.createMany({
      data: driverRecords,
    });
  }
  
  async getCachedForecasts(productId: string, storeId: string, horizon: number) {
    const forecasts = await this.prisma.forecast.findMany({
      where: { productId, storeId },
      take: Number(horizon),
      orderBy: { date: 'asc' },
    });
    
    if (forecasts.length === 0) return null;
    
    const drivers = await this.prisma.forecastDriver.findMany({
      where: { productId, storeId },
    });
    
    return {
      productId,
      storeId,
      modelType: forecasts[0]?.modelType || 'Prophet',
      confidence: forecasts[0]?.confidence || 0.87,
      generatedAt: forecasts[0]?.generatedAt.toISOString(),
      forecasts: forecasts.map(f => ({
        date: f.date.toISOString().split('T')[0],
        predictedSales: f.predictedSales,
        confidenceLower: f.confidenceLower,
        confidenceUpper: f.confidenceUpper,
        revenue: f.revenue,
      })),
      drivers: drivers.map(d => ({
        name: d.name,
        nameSi: d.nameSi,
        impact: d.impact,
        description: d.description,
        descriptionSi: d.descriptionSi,
      })),
    };
  }
}

@ApiTags('Forecasts')
@Controller('forecasts')
@ApiBearerAuth('JWT-auth')
class ForecastsController {
  constructor(private forecastsService: ForecastsService) {}
  
  @Get()
  @ApiOperation({ 
    summary: 'Get AI sales forecasts',
    description: 'Retrieve 30-day sales forecasts powered by XGBoost ML model with confidence intervals and feature importance drivers. Includes bilingual explanations.',
  })
  @ApiQuery({ name: 'productId', required: true, type: String, description: 'Product ID', example: 'P0001' })
  @ApiQuery({ name: 'storeId', required: true, type: String, description: 'Store ID', example: 'S001' })
  @ApiQuery({ name: 'horizon', required: false, type: Number, description: 'Forecast horizon in days (default: 30)', example: 30 })
  @ApiResponse({ 
    status: 200, 
    description: 'Forecasts retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          productId: 'P0001',
          storeId: 'S001',
          modelType: 'Prophet',
          confidence: 0.87,
          generatedAt: '2025-12-04T18:00:00Z',
          forecasts: [
            {
              date: '2025-12-05',
              predictedSales: 14.5,
              confidenceLower: 11.8,
              confidenceUpper: 17.2,
              revenue: 791.08,
            },
          ],
          drivers: [
            {
              name: 'Seasonality Factor',
              nameSi: 'කාලීය සාධකය',
              impact: 0.35,
              description: 'Strong weekly seasonality pattern detected',
              descriptionSi: 'ශක්තිමත් සතිපතා කාලීය රටාවක් හඳුනාගෙන ඇත',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getForecasts(@Query() query) {
    return this.forecastsService.getForecasts(query);
  }
}

@Module({
  imports: [HttpModule],
  controllers: [ForecastsController],
  providers: [ForecastsService],
  exports: [ForecastsService],
})
export class ForecastsModule {}
