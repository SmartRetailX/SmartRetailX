import { HttpModule, HttpService } from '@nestjs/axios';
import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@smart-retail-x/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
class XaiService {
  private mlServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
  }

  async explainForecast(query: any) {
    const { productId, date, lang = 'en' } = query;

    const response = await firstValueFrom(
      this.httpService.post(`${this.mlServiceUrl}/api/v1/explain/forecast`, {
        productId,
        date,
        lang,
      }),
    );

    return response.data;
  }

  async explainRestock(alertId: string, lang = 'en') {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.mlServiceUrl}/api/v1/explain/restock?alert_id=${alertId}&lang=${lang}`,
        {},
      ),
    );

    return response.data;
  }
}

@ApiTags('XAI')
@Controller('xai')
@ApiBearerAuth('JWT-auth')
class XaiController {
  constructor(private xaiService: XaiService) {}

  @Get('explain/forecast')
  @ApiOperation({
    summary: 'Explain AI forecast predictions',
    description:
      'Get Explainable AI (XAI) feature importance and SHAP-like explanations for forecast predictions. Shows how each feature (seasonality, day of week, etc.) contributes to the prediction with bilingual descriptions.',
  })
  @ApiQuery({ name: 'productId', required: true, type: String, example: 'PROD001' })
  @ApiResponse({
    status: 200,
    description: 'Forecast explanation retrieved',
    schema: {
      example: {
        success: true,
        data: {
          explanation: {
            predictedValue: 12.5,
            confidence: 0.87,
            baseValue: 8.5,
            modelType: 'XGBoost',
            features: [
              {
                name: 'Seasonality Factor',
                nameSi: 'කාලීය සාධකය',
                value: '1.45',
                contribution: 2.8,
                description: 'Current season shows 45% higher demand',
                descriptionSi: 'වත්මන් කාලය 45% ඉහළ ඉල්ලුමක් පෙන්වයි',
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async explainForecast(@Query() query) {
    return this.xaiService.explainForecast(query);
  }

  @Get('explain/restock')
  @ApiOperation({
    summary: 'Explain AI restock recommendations',
    description:
      'Get Explainable AI explanations for why specific restock quantities are recommended. Shows feature contributions like current stock levels, sales velocity, and lead time.',
  })
  @ApiQuery({
    name: 'alertId',
    required: true,
    type: String,
    description: 'Alert ID to explain',
    example: 'ALT0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Restock explanation retrieved',
    schema: {
      example: {
        success: true,
        data: {
          explanation: {
            predictedValue: 50,
            confidence: 0.92,
            baseValue: 25,
            modelType: 'Random Forest',
            features: [
              {
                name: 'Current Stock Level',
                nameSi: 'වත්මන් තොග මට්ටම',
                value: '12',
                contribution: -8.5,
                description: 'Stock is critically low',
                descriptionSi: 'තොගය විවේචනාත්මකව අඩුයි',
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async explainRestock(@Query() query) {
    return this.xaiService.explainRestock(query.alertId);
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
