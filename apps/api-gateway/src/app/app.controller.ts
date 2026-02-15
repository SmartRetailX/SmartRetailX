import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   * Returns health status of API Gateway and all connected microservices
   */
  @Get('health')
  async getHealth() {
    try {
      const microserviceHealth = await this.appService.getHealth();
      return microserviceHealth;
    } catch (error) {
      return {
        apiGateway: this.appService.getHealth(),
        error: 'Failed to retrieve microservice health',
        details: error.message || 'Unknown error',
      };
    }
  }
}
