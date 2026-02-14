import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { AppService } from './app.service';

@Controller('core')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'health' })
  getHealth() {
    return this.appService.getHealth();
  }
}
