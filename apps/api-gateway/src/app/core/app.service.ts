import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class CoreService {
  constructor(@Inject('CORE_SERVICE') private readonly systemClient: ClientProxy) {}

  getMicroserviceHealth() {
    console.log('Checking health of CORE_SERVICE...');
    return this.systemClient.send({ cmd: 'health' }, {});
  }
}
