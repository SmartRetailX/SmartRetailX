import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MessagingHealthIndicator } from '@smart-retail-x/messaging';

@Controller('health/messaging')
export class MessagingHealthController {
  constructor(
    private readonly messagingHealth: MessagingHealthIndicator,
    @Inject('CORE_SERVICE') private readonly coreService: ClientProxy,
    @Inject('BI_DASHBOARD_SERVICE') private readonly biService: ClientProxy,
  ) {}

  /**
   * Check RabbitMQ connectivity
   */
  @Get('rabbitmq')
  async checkRabbitMQ() {
    return this.messagingHealth.checkRabbitMQConnection('rabbitmq');
  }

  /**
   * Check all microservices health
   */
  @Get('services')
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
  async checkCore() {
    return this.messagingHealth.checkMicroservice('core-service', this.coreService);
  }

  /**
   * Check BI Dashboard Service health
   */
  @Get('bi-dashboard')
  async checkBiDashboard() {
    return this.messagingHealth.checkMicroservice('bi-dashboard-service', this.biService);
  }

  /**
   * Comprehensive health check - RabbitMQ + all services
   */
  @Get()
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
