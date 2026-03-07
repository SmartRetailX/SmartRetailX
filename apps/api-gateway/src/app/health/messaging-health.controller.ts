import { Controller, Get, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagingHealthIndicator } from '@smart-retail-x/messaging';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Messaging Health')
@AllowAnonymous()
@Controller('health/messaging')
export class MessagingHealthController implements OnModuleInit {
  private readonly logger = new Logger(MessagingHealthController.name);

  constructor(
    private readonly messagingHealth: MessagingHealthIndicator,
    @Inject('CORE_SERVICE') private readonly coreService: ClientProxy,
    @Inject('BI_DASHBOARD_SERVICE') private readonly biService: ClientProxy,
  ) {}

  /**
   * Eagerly connect RabbitMQ clients on module initialization
   * This prevents lazy connection during the first health check
   */
  async onModuleInit() {
    try {
      this.logger.log('Connecting to microservices...');
      await Promise.all([this.coreService.connect(), this.biService.connect()]);
      this.logger.log('✓ All microservice clients connected');
    } catch (error) {
      this.logger.error('Failed to connect microservice clients:', error);
    }
  }

  /**
   * Check RabbitMQ connectivity
   */
  @Get('rabbitmq')
  @ApiOperation({
    summary: 'RabbitMQ connection check',
    description: 'Checks if RabbitMQ is connected and responsive',
  })
  @ApiResponse({ status: 200, description: 'RabbitMQ health status' })
  async checkRabbitMQ() {
    return this.messagingHealth.checkRabbitMQConnection('rabbitmq');
  }

  /**
   * Check all microservices health
   */
  @Get('services')
  @ApiOperation({
    summary: 'All microservices health check',
    description: 'Checks health of all connected microservices',
  })
  @ApiResponse({ status: 200, description: 'Microservices health status' })
  async checkServices() {
    return this.messagingHealth.checkMicroservices({
      'core-service': this.coreService,
      'bi-dashboard-service': this.biService,
    });
  }

  /**
   * Check Core Service health
   */
  @Get('core')
  @ApiOperation({
    summary: 'Core service health check',
    description: 'Checks health of the core microservice via RabbitMQ',
  })
  @ApiResponse({ status: 200, description: 'Core service health status' })
  async checkCore() {
    return this.messagingHealth.checkMicroservice('core-service', this.coreService);
  }

  /**
   * Check BI Dashboard Service health
   */
  @Get('bi-dashboard')
  @ApiOperation({
    summary: 'BI Dashboard service health check',
    description: 'Checks health of the BI Dashboard microservice via RabbitMQ',
  })
  @ApiResponse({ status: 200, description: 'BI Dashboard service health status' })
  async checkBiDashboard() {
    return this.messagingHealth.checkMicroservice('bi-dashboard-service', this.biService);
  }

  /**
   * Comprehensive health check - RabbitMQ + all services
   */
  @Get()
  @ApiOperation({
    summary: 'Comprehensive messaging health check',
    description: 'Checks RabbitMQ connection and all microservices health',
  })
  @ApiResponse({ status: 200, description: 'Health check results' })
  async checkAll() {
    const [rabbitmq, services] = await Promise.all([
      this.messagingHealth.checkRabbitMQConnection('rabbitmq'),
      this.messagingHealth.checkMicroservices({
        'core-service': this.coreService,
        'bi-dashboard-service': this.biService,
      }),
    ]);

    // Determine overall status
    const allHealthy = rabbitmq.rabbitmq.status === 'up' && services.microservices.status === 'up';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        ...rabbitmq,
        ...services,
      },
    };
  }
}
