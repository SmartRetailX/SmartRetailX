import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('ASSISTANT_SERVICE') private assistantClient: ClientProxy,
  ) {}

  // Health check endpoint
  @Get('health')
  async getHealth() {
    // Check API Gateway health
    const gatewayHealth = this.appService.getHealth();

    // Check Assistant Service health
    try {
      const assistantHealth = await firstValueFrom(
        this.assistantClient.send({ cmd: 'health' }, {}).pipe(
          timeout(5000), // 5 second timeout for health checks
          defaultIfEmpty({ status: 'unavailable', message: 'No response from service' }),
          catchError((error) => {
            throw error;
          }),
        ),
      );
      return {
        gateway: gatewayHealth,
        services: {
          assistant: assistantHealth,
        },
      };
    } catch (error) {
      return {
        gateway: gatewayHealth,
        services: {
          assistant: { status: 'unhealthy', error: error.message },
        },
      };
    }
  }
}
