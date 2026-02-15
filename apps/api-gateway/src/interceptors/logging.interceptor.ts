import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logging interceptor to monitor all HTTP requests to the API Gateway
 * Logs request details and response time for performance monitoring
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'N/A';
    const userId = request.user?.id || 'anonymous';

    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `📥 ${method} ${url} - User: ${userId} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const duration = Date.now() - startTime;
          const emoji = this.getStatusEmoji(statusCode);

          this.logger.log(
            `📤 ${emoji} ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`,
          );
        },
        error: (error) => {
          const statusCode = error.status || 500;
          const duration = Date.now() - startTime;
          const emoji = this.getStatusEmoji(statusCode);

          this.logger.error(
            `📤 ${emoji} ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }

  /**
   * Get emoji based on HTTP status code
   */
  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return '✅';
    if (statusCode >= 300 && statusCode < 400) return '🔀';
    if (statusCode >= 400 && statusCode < 500) return '⚠️';
    if (statusCode >= 500) return '❌';
    return '❓';
  }
}
