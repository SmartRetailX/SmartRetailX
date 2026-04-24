import { Injectable } from '@nestjs/common';

import { AppWebSocketGateway } from './websocket.gateway';

@Injectable()
export class AppService {
  constructor(private readonly gateway: AppWebSocketGateway) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'websocket-service',
      timestamp: new Date().toISOString(),
      details: this.gateway.getConnectionStats(),
    };
  }

  getStats() {
    return this.gateway.getConnectionStats();
  }
}
