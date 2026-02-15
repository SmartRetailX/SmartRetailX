import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Basic health check endpoint
   * Returns service status and configuration info
   */
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      environment: this.configService.nodeEnv,
      version: '1.0.0',
    };
  }

  /**
   * Liveness probe - used by Kubernetes/Docker
   * Returns 200 if service is alive
   */
  @Get('live')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - used by Kubernetes/Docker
   * Returns 200 if service is ready to accept traffic
   */
  @Get('ready')
  readiness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ready: true,
    };
  }
}
