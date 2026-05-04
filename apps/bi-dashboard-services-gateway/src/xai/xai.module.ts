import { HttpModule, HttpService } from '@nestjs/axios';
import { Controller, Get, HttpException, HttpStatus, Injectable, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@smart-retail-x/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
class XaiService {
  private mlServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  /**
   * Explain forecast predictions using SHAP.
   * 
   * Calls ML service at POST /api/v1/explain/forecast with:
   *   { productId, date?, lang }
   */
  async explainForecast(query: any) {
    const { productId, date, lang = 'en' } = query;

    if (!productId) {
      throw new HttpException('productId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      console.log(`[XAI-FORECAST] Explaining forecast: product=${productId}, date=${date}, lang=${lang}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/explain/forecast`, {
          productId,
          date,
          lang,
        }),
      );

      console.log(`[XAI-FORECAST] ✅ Explanation generated`);

      return response.data;
    } catch (error) {
      console.error(`[XAI-FORECAST] ❌ Error: ${error.message}`);

      if (error.response?.status === 503) {
        throw new HttpException(
          'ML service unavailable. Models may not be trained yet. Run: python train_models.py',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to explain forecast: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Explain restock recommendations using SHAP.
   * 
   * Calls ML service at POST /api/v1/explain/restock with:
   *   { alertId, lang }
   * 
   * Note: alertId comes from the alerts/generate endpoint (the product DB UUID)
   */
  async explainRestock(alertId: string, lang = 'en') {
    if (!alertId) {
      throw new HttpException('alertId is required', HttpStatus.BAD_REQUEST);
    }

    try {
      console.log(`[XAI-RESTOCK] Explaining restock: alertId=${alertId}, lang=${lang}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/api/v1/explain/restock`, {
          alertId,
          lang,
        }),
      );

      console.log(`[XAI-RESTOCK] ✅ Explanation generated`);

      return response.data;
    } catch (error) {
      console.error(`[XAI-RESTOCK] ❌ Error: ${error.message}`);

      if (error.response?.status === 503) {
        throw new HttpException(
          'ML service unavailable. Restock models may not be trained yet.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to explain restock: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

@ApiTags('XAI')
@Controller('xai')
@ApiBearerAuth('JWT-auth')
class XaiController {
  constructor(private xaiService: XaiService) {}

  @Get('explain/forecast')
  @ApiOperation({
    summary: 'Explain AI forecast predictions (SHAP)',
    description:
      'Get Explainable AI (XAI) feature importance and SHAP-based explanations for forecast predictions. ' +
      'Shows how each feature (seasonality, day of week, promotions, weather, inventory, competitor pricing, etc.) ' +
      'contributes to the forecast value. Bilingual descriptions in English and Sinhala.',
  })
  @ApiQuery({
    name: 'productId',
    required: true,
    type: String,
    description: 'Product SKU (e.g., "P001") or database UUID. Must match a trained model.',
    example: 'P001',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Target date for explanation (ISO format: YYYY-MM-DD). Default: today.',
    example: '2025-05-15',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language: "en" (English) or "si" (Sinhala, සිංහල)',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'SHAP explanation for forecast retrieved',
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
            si: 'අනුමාන මූලික මතට ඉහළ ඒකක 12.5, ප්‍රධාන වශයෙන් සති අන්ත බලපෑම සහ ඉහළ වට්ටම්',
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
              contribution: '+3.2 units',
              importance: 0.95,
              description: 'Thursday (day 3) increases sales by 3.2 units',
              descriptionSi: 'බ්‍රහස්පතින්දා (දින 3) විකුණුම් 3.2 ඒකක වැඩි කරයි',
            },
            {
              name: 'Discount Effect',
              nameSi: 'වට්ටම් බලපෑම',
              value: 15.0,
              impact: 2.8,
              direction: 'increase',
              contribution: '+2.8 units',
              importance: 0.89,
              description: '15% discount boosts sales by 2.8 units',
              descriptionSi: '15% වට්ටම් විකුණුම් 2.8 ඒකක වැඩි කරයි',
            },
          ],
          generatedAt: '2025-05-04T12:34:56.789012',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Missing productId' })
  @ApiResponse({ status: 503, description: 'ML service unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async explainForecast(@Query() query) {
    return this.xaiService.explainForecast(query);
  }

  @Get('explain/restock')
  @ApiOperation({
    summary: 'Explain AI restock recommendations (SHAP)',
    description:
      'Get Explainable AI explanations for why specific restock quantities are recommended. ' +
      'Shows feature contributions from current stock levels, sales velocity, reorder point, and lead time. ' +
      'Bilingual descriptions in English and Sinhala.',
  })
  @ApiQuery({
    name: 'alertId',
    required: true,
    type: String,
    description: 'Alert ID returned from /api/v1/alerts/generate or analyze-product endpoint. Usually a product UUID.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: String,
    description: 'Language: "en" (English) or "si" (Sinhala, සිංහල)',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'SHAP explanation for restock retrieved',
    schema: {
      example: {
        success: true,
        data: {
          alertId: '550e8400-e29b-41d4-a716-446655440000',
          productId: 'db-uuid-abc123',
          productName: 'Widget A',
          modelType: 'XGBoost + Prophet',
          explanation: {
            en: 'Restock recommended because current stock (45 units) is 20 units below reorder level (65 units), and AI predicts demand of 8.5 units/day.',
            si: 'නැවත පිරවීම නිර්දේශ කෙරේ, මන්ද වත්මන් තොගය (45 ඒකක) නැවත ඇණවුම් මට්ටමට (65 ඒකක) 20 ඒකක පහළ වන අතර AI දිනකට 8.5 ඒකක ඉල්ලුම පුරෝකථනය කරයි.',
          },
          features: [
            {
              name: 'Current Stock',
              nameSi: 'වත්මන් තොගය',
              value: 45.0,
              impact: -20.0,
              direction: 'decrease',
              contribution: '-20 units vs reorder level',
              importance: 1.0,
              description: 'Current stock (45 units) is critically low.',
              descriptionSi: 'වත්මන් තොගය (45 ඒකක) අතිශයින් අඩු ය.',
            },
            {
              name: 'Predicted Daily Demand',
              nameSi: 'පුරෝකථනය කරන ලද දෛනික ඉල්ලුම',
              value: 8.5,
              impact: 5.2,
              direction: 'increase',
              importance: 0.92,
            },
          ],
          metrics: {
            predictedDailyDemand: 8.5,
            baselineDemand: 6.2,
            currentStock: 45,
            reorderLevel: 65,
            daysUntilStockout: 5.3,
            recommendedQuantity: 140,
          },
          confidence: 0.89,
          generatedAt: '2025-05-04T12:34:56.789012',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Missing alertId' })
  @ApiResponse({ status: 503, description: 'ML service unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async explainRestock(@Query() query) {
    const { alertId, lang = 'en' } = query;
    return this.xaiService.explainRestock(alertId, lang);
  }
}

@Module({
  imports: [HttpModule],
  controllers: [XaiController],
  providers: [XaiService],
  exports: [XaiService],
})
export class XaiModule {}

export { XaiService };