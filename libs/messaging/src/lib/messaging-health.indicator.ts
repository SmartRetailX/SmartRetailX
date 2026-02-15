import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@smart-retail-x/config';
import * as amqp from 'amqplib';

/**
 * Health check options for messaging services
 */
export interface MessagingHealthCheckOptions {
  /**
   * Timeout in milliseconds (default: 5000ms)
   */
  timeout?: number;
  /**
   * Custom health check command to send to microservice
   * Default: { cmd: 'health' }
   */
  healthCommand?: Record<string, unknown>;
}

/**
 * Health check result with response time
 */
export interface MessagingHealthResult {
  status: 'up' | 'down';
  responseTime: number;
  message?: string;
}

/**
 * MessagingHealthIndicator provides health checks for RabbitMQ and microservices
 * Checks connectivity and optionally pings microservices
 */
@Injectable()
export class MessagingHealthIndicator {
  private readonly DEFAULT_TIMEOUT = 5000;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check RabbitMQ connectivity
   * @param key - Health check key for the result
   * @param options - Health check options
   * @returns Health indicator result with response time
   */
  async checkRabbitMQConnection(
    key: string,
    options?: MessagingHealthCheckOptions,
  ): Promise<HealthIndicatorResult> {
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const startTime = Date.now();

    try {
      const uri = this.configService.rabbitmqUri;

      // Create connection with timeout
      const connection = await Promise.race([
        amqp.connect(uri),
        this.createTimeoutPromise(timeout),
      ]);

      if (!connection) {
        throw new Error('Connection timeout');
      }

      // Test channel creation
      const channel = await connection.createChannel();
      await channel.close();
      await connection.close();

      const responseTime = Date.now() - startTime;

      return {
        [key]: {
          status: 'up',
          responseTime,
          message: 'RabbitMQ connection successful',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        [key]: {
          status: 'down',
          responseTime,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Check multiple microservices health in parallel
   * @param services - Map of service names to ClientProxy instances
   * @param options - Health check options
   * @returns Health indicator result with individual service statuses
   */
  async checkMicroservices(
    services: Record<string, ClientProxy>,
    options?: MessagingHealthCheckOptions,
  ): Promise<HealthIndicatorResult> {
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const healthCommand = options?.healthCommand ?? { cmd: 'health' };

    // Check all services in parallel
    const serviceChecks = Object.entries(services).map(([name, client]) =>
      this.checkSingleService(name, client, healthCommand, timeout),
    );

    const results = await Promise.all(serviceChecks);

    // Aggregate results
    const aggregated: Record<string, MessagingHealthResult> = {};
    let allHealthy = true;

    results.forEach(({ name, result }) => {
      aggregated[name] = result;
      if (result.status === 'down') {
        allHealthy = false;
      }
    });

    return {
      microservices: {
        status: allHealthy ? 'up' : 'down',
        ...aggregated,
      },
    };
  }

  /**
   * Check a single microservice health
   * @param name - Service name
   * @param client - ClientProxy instance
   * @param healthCommand - Health check command
   * @param timeout - Timeout in milliseconds
   * @returns Service check result
   */
  private async checkSingleService(
    name: string,
    client: ClientProxy,
    healthCommand: Record<string, unknown>,
    timeout: number,
  ): Promise<{ name: string; result: MessagingHealthResult }> {
    const startTime = Date.now();

    try {
      // Send health check command with timeout
      await Promise.race([
        client.send(healthCommand, {}).toPromise(),
        this.createTimeoutPromise(timeout),
      ]);

      const responseTime = Date.now() - startTime;

      return {
        name,
        result: {
          status: 'up',
          responseTime,
          message: 'Service responding',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        name,
        result: {
          status: 'down',
          responseTime,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Check a single microservice (individual health check)
   * @param key - Health check key
   * @param client - ClientProxy instance
   * @param options - Health check options
   * @returns Health indicator result
   */
  async checkMicroservice(
    key: string,
    client: ClientProxy,
    options?: MessagingHealthCheckOptions,
  ): Promise<HealthIndicatorResult> {
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const healthCommand = options?.healthCommand ?? { cmd: 'health' };
    const startTime = Date.now();

    try {
      await Promise.race([
        client.send(healthCommand, {}).toPromise(),
        this.createTimeoutPromise(timeout),
      ]);

      const responseTime = Date.now() - startTime;

      return {
        [key]: {
          status: 'up',
          responseTime,
          message: 'Service responding',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        [key]: {
          status: 'down',
          responseTime,
          message: errorMessage,
        },
      };
    }
  }

  /**
   * Create a promise that rejects after specified timeout
   * @param ms - Timeout in milliseconds
   * @returns Promise that rejects on timeout
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${ms}ms`));
      }, ms);
    });
  }
}
