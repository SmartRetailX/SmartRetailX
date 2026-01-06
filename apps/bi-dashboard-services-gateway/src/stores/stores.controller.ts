import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
@ApiBearerAuth('JWT-auth')
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  @ApiOperation({
    summary: 'Get stores',
    description: 'Retrieve list of retail stores with location, contact information, and operational status.',
  })
  @ApiQuery({ name: 'active', required: false, type: Boolean, example: true, description: 'Filter by active status' })
  @ApiQuery({ name: 'city', required: false, type: String, example: 'Colombo', description: 'Filter by city' })
  @ApiResponse({
    status: 200,
    description: 'Stores retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          stores: [
            {
              id: 'S001',
              name: 'Colombo Central Store',
              nameSi: 'කෞලඹ මද්‍යම වෙලඳසැල',
              address: '123 Main St, Colombo 01',
              city: 'Colombo',
              phone: '+94112345678',
              manager: 'John Silva',
              active: true,
              openingHours: 'Mon-Sat: 8AM-8PM, Sun: 9AM-6PM',
              latitude: 6.9271,
              longitude: 79.8612,
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStores(@Query() query) {
    return this.storesService.getStores(query);
  }
}
