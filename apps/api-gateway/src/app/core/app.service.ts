import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class CoreService implements OnModuleInit {
  private readonly logger = new Logger(CoreService.name);

  constructor(@Inject('CORE_SERVICE') private readonly coreClient: ClientProxy) {}

  /**
   * Eagerly connect RabbitMQ client on module initialization
   * This prevents lazy connection during the first request
   */
  async onModuleInit() {
    try {
      await this.coreClient.connect();
      this.logger.log('✓ Core service client connected');
    } catch (error) {
      this.logger.error('Failed to connect core service client:', error);
    }
  }

  /**
   * Get microservice health status
   * Returns an Observable that emits the health status
   */
  getMicroserviceHealth(): Observable<unknown> {
    this.logger.debug('Checking health of CORE_SERVICE...');
    return this.coreClient.send({ cmd: 'health' }, {});
  }
}
