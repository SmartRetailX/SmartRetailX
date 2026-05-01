import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { VoiceService } from './voice.service';

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  @Post('text-query')
  @ApiOperation({
    summary: 'Process voice/text query',
    description:
      'Process natural language query for voice assistant with bilingual responses. Supports inventory queries, sales reports, and product search.',
  })
  @ApiBody({
    schema: {
      example: {
        query: 'Show me products that need restocking',
        language: 'en',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Query processed successfully',
    schema: {
      example: {
        success: true,
        data: {
          intent: 'query_inventory',
          entities: {
            action: 'restock',
            status: 'low_stock',
          },
          response: 'You have 15 products that need restocking across all stores.',
          responseSi: 'සියලුම වෙළඳසැල් හරහා නැවත තොග කිරීම අවශ්‍ය නිෂ්පාදන 15 ක් ඔබට ඇත.',
          data: {
            products: [
              {
                id: '70001',
                name: 'Basmati Rice 5kg',
                currentStock: 12,
                reorderLevel: 20,
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query format' })
  async processTextQuery(@Body() queryDto) {
    return this.voiceService.processTextQuery(queryDto);
  }
}
