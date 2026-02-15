import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@smart-retail-x/config';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Health')
@AllowAnonymous()
@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Basic health check endpoint
   * Returns service status and configuration info
   */
  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Returns service status and configuration info',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
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
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Used by Kubernetes/Docker to check if service is alive',
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
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
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Used by Kubernetes/Docker to check if service is ready to accept traffic',
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  readiness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      ready: true,
    };
  }
}
