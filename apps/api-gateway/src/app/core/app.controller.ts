import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';

import { CoreService } from './app.service';

@ApiTags('Core Service')
@Controller('core')
export class CoreController {
  private readonly logger = new Logger(CoreController.name);

  constructor(private readonly coreService: CoreService) {}

  /**
   * Core service health check endpoint
   * Returns the health status of the core microservice
   */
  @Get('health')
  @ApiOperation({
    summary: 'Core service health check',
    description: 'Returns the health status of the core microservice',
  })
  @ApiResponse({ status: 200, description: 'Core service health status' })
  async getHealth() {
    try {
      const health = await firstValueFrom(
        this.coreService.getMicroserviceHealth().pipe(timeout(5000)),
      );
      return health;
    } catch (error) {
      this.logger.error('Failed to retrieve core service health', error.message);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve core service health',
      };
    }
  }
}
