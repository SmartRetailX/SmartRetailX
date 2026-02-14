import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): {
    status: string;
    service: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
  } {
    return {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
