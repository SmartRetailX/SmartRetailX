import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';

import { CoreService } from './core/app.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly coreService: CoreService) {}

  // Get health status of microservices
  async getHealth() {
    const apiGatewayHealth = {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    try {
      const coreHealth = await firstValueFrom(
        this.coreService.getMicroserviceHealth().pipe(timeout(5000)),
      );
      return {
        apiGateway: apiGatewayHealth,
        core: coreHealth,
      };
    } catch (error) {
      this.logger.error('Failed to get core service health', error.message);
      return {
        apiGateway: apiGatewayHealth,
        core: { status: 'unhealthy', error: error.message },
      };
    }
  }
}
