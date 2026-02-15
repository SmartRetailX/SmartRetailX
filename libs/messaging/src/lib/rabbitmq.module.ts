import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@smart-retail-x/config';

export interface RabbitMQModuleOptions {
  /**
   * Name identifier for this client instance
   */
  name: string;
  /**
   * Function that extracts queue name from ConfigService
   * Example: (config) => config.coreServiceQueue
   */
  queueGetter: (config: ConfigService) => string;
}

/**
 * RabbitMQ Module for microservices communication
 * Provides type-safe, dynamic queue registration using existing ConfigService
 */
@Module({})
export class RabbitMQModule {
  /**
   * Register a RabbitMQ client with dynamic queue configuration
   * @param options Configuration options including name and queueGetter
   * @returns Dynamic module with RabbitMQ client
   */
  static register(options: RabbitMQModuleOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: options.name,
            useFactory: (configService: ConfigService) => {
              const queue = options.queueGetter(configService);
              const uri = configService.rabbitmqUri;

              return {
                transport: Transport.RMQ,
                options: {
                  urls: [uri],
                  queue,
                  queueOptions: {
                    durable: true,
                  },
                  // Connection retry settings
                  socketOptions: {
                    heartbeatIntervalInSeconds: 60,
                    reconnectTimeInSeconds: 5,
                  },
                },
              };
            },
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  /**
   * Register multiple RabbitMQ clients at once
   * @param options Array of configuration options
   * @returns Dynamic module with multiple RabbitMQ clients
   */
  static registerMany(options: RabbitMQModuleOptions[]): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        ClientsModule.registerAsync(
          options.map((option) => ({
            name: option.name,
            useFactory: (configService: ConfigService) => {
              const queue = option.queueGetter(configService);
              const uri = configService.rabbitmqUri;

              return {
                transport: Transport.RMQ,
                options: {
                  urls: [uri],
                  queue,
                  queueOptions: {
                    durable: true,
                  },
                  socketOptions: {
                    heartbeatIntervalInSeconds: 60,
                    reconnectTimeInSeconds: 5,
                  },
                },
              };
            },
            inject: [ConfigService],
          })),
        ),
      ],
      exports: [ClientsModule],
    };
  }
}
