import { Controller, Get, Logger } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';

import { CoreService } from './app.service';

@Controller('core')
export class CoreController {
  private readonly logger = new Logger(CoreController.name);

  constructor(private readonly coreService: CoreService) {}

  /**
   * Core service health check endpoint
   * Returns the health status of the core microservice
   */
  @Get('health')
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
