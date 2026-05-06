import { Controller, Get, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BroadcastPayload, SendToUserPayload, WEBSOCKET_PATTERNS } from '@smart-retail-x/messaging';

import { AppService } from './app.service';
import { AppWebSocketGateway } from './websocket.gateway';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly gateway: AppWebSocketGateway,
    private readonly appService: AppService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('stats')
  getStats() {
    return this.appService.getStats();
  }

  @EventPattern(WEBSOCKET_PATTERNS.BROADCAST)
  handleBroadcast(@Payload() payload: BroadcastPayload) {
    this.logger.log(`Received broadcast event: ${payload.event}`);
    this.gateway.broadcastToAll(payload.event, payload.data);
  }

  @EventPattern(WEBSOCKET_PATTERNS.SEND_TO_USER)
  handleSendToUser(@Payload() payload: SendToUserPayload) {
    this.logger.log(`Received sendToUser event: ${payload.event} for user ${payload.userId}`);
    this.gateway.sendToUser(payload.userId, payload.event, payload.data);
  }
}
