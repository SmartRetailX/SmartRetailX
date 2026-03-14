import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { 
  WEBSOCKET_PATTERNS, 
  BroadcastPayload, 
  SendToUserPayload 
} from '@smart-retail-x/messaging';
import { AppWebSocketGateway } from './websocket.gateway';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly gateway: AppWebSocketGateway,
    private readonly appService: AppService
  ) {}

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
