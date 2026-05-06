import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { AppService } from './app.service';

@Controller('core')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   */
  @MessagePattern({ cmd: 'health' })
  getHealth() {
    this.logger.log('📥 Received health check request');
    const result = this.appService.getHealth();
    this.logger.log(`📤 Sending health check response`);
    return result;
  }
}
