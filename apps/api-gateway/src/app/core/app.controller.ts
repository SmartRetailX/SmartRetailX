import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { CoreService } from './app.service';

@Controller('core')
export class CoreController {
  constructor(
    private readonly coreService: CoreService,
    @Inject('CORE_SERVICE') private assistantClient: ClientProxy,
  ) {}

  // Health check endpoint
  @Get()
  async getHealth() {
    try {
      return this.coreService.getMicroserviceHealth();
    } catch (error) {
      return error;
    }
  }
}
