import { All, Controller, HttpStatus, Inject, Logger, Req, Res } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, defaultIfEmpty, firstValueFrom, timeout } from 'rxjs';

/**
 * BI Dashboard Proxy Controller
 *
 * Proxies all /bi/* requests to the BI Dashboard microservice via RabbitMQ.
 * This allows the BI Dashboard service to run without its own HTTP port,
 * with all traffic routed through the API Gateway.
 */
@Controller('bi')
export class BiDashboardController {
  private readonly logger = new Logger(BiDashboardController.name);

  constructor(@Inject('BI_DASHBOARD_SERVICE') private readonly biDashboardClient: ClientProxy) {}

  /**
   * Catch-all route that proxies requests to BI Dashboard microservice
   */
  @All('*path')
  async proxyRequest(@Req() req: any, @Res() res: any) {
    // Extract the path after /bi/
    const path = req.path.replace(/^\/api\/bi\/?/, '') || '';
    const method = req.method.toUpperCase();

    // Build the message pattern
    const pattern = `bi.${method.toLowerCase()}.${path.replace(/\//g, '.') || 'root'}`;

    // Build the payload
    const payload = {
      path,
      method,
      query: req.query,
      body: req.body,
      params: req.params,
      user: (req as any).user, // User from JWT auth if present
      headers: {
        authorization: req.headers.authorization,
        'content-type': req.headers['content-type'],
      },
    };

    this.logger.debug(`Proxying ${method} /bi/${path} → ${pattern}`);

    try {
      const result = await firstValueFrom(
        this.biDashboardClient.send(pattern, payload).pipe(
          timeout(30000), // 30 second timeout
          defaultIfEmpty({ statusCode: 503, success: false, error: 'No response from BI service' }),
          catchError((error) => {
            this.logger.error(`RabbitMQ error for ${pattern}:`, error.message);
            throw error;
          }),
        ),
      );

      // Handle the response
      if (result?.statusCode) {
        res.status(result.statusCode);
      }

      return res.json(result);
    } catch (error: any) {
      this.logger.error(`Failed to proxy ${method} /bi/${path}:`, error.message);

      // Handle timeout errors
      if (error.name === 'TimeoutError') {
        return res.status(HttpStatus.GATEWAY_TIMEOUT).json({
          success: false,
          error: 'Service timeout',
          message: 'BI Dashboard service did not respond in time',
        });
      }

      // Handle connection errors
      if (error.message?.includes('Connection') || error.message?.includes('ECONNREFUSED')) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'Service unavailable',
          message: 'BI Dashboard service is not available',
        });
      }

      // Handle other errors
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || 'Internal server error',
        message: 'Failed to process request',
      });
    }
  }
}
