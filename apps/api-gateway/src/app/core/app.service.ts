import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class CoreService {
  private readonly logger = new Logger(CoreService.name);

  constructor(@Inject('CORE_SERVICE') private readonly coreClient: ClientProxy) {}

  /**
   * Get microservice health status
   * Returns an Observable that emits the health status
   */
  getMicroserviceHealth(): Observable<unknown> {
    this.logger.debug('Checking health of CORE_SERVICE...');
    return this.coreClient.send({ cmd: 'health' }, {});
  }
}
