import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { AppService } from './core.service';

@Controller('core')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('CORE_SERVICE') private assistantClient: ClientProxy,
  ) {}

  // Health check endpoint
  @Get('health')
  async getHealth() {
    // Check API Gateway health
    const gatewayHealth = this.appService.getHealth();

    // Check Assistant Service health
    try {
      return gatewayHealth;
    } catch (error) {
      return error;
    }
  }
}
