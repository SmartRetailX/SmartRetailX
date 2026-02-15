import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { MessagingHealthIndicator } from './messaging-health.indicator';

/**
 * MessagingHealthModule provides health check capabilities for messaging infrastructure
 *
 * Features:
 * - RabbitMQ connectivity checks
 * - Microservice health pings
 * - Response time tracking
 * - Parallel health checks for multiple services
 *
 * @example
 * ```typescript
 * // Import in your application module
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     MessagingHealthModule,
 *   ],
 * })
 * export class AppModule {}
 *
 * // Use in health controller
 * @Controller('health')
 * export class HealthController {
 *   constructor(
 *     private health: HealthCheckService,
 *     private messagingHealth: MessagingHealthIndicator,
 *     @Inject('CORE_SERVICE') private coreService: ClientProxy,
 *   ) {}
 *
 *   @Get()
 *   @HealthCheck()
 *   check() {
 *     return this.health.check([
 *       () => this.messagingHealth.checkRabbitMQConnection('rabbitmq'),
 *       () => this.messagingHealth.checkMicroservice('core-service', this.coreService),
 *     ]);
 *   }
 * }
 * ```
 */
@Module({
  imports: [TerminusModule],
  providers: [MessagingHealthIndicator],
  exports: [MessagingHealthIndicator, TerminusModule],
})
export class MessagingHealthModule {}
