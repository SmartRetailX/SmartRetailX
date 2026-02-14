import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@smart-retail-x/config';

import { AuthModule } from '../auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BiDashboardModule } from './bi-dashboard/bi-dashboard.module';
import { CoreModule } from './core/app.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    CoreModule,
    BiDashboardModule,
    ClientsModule.registerAsync([
      {
        name: 'ASSISTANT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.rabbitmqUri],
            queue: configService.assistantServiceQueue,
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
