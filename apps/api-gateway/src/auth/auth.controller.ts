import { All, Controller, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { BetterAuthInstance } from '../lib/better-auth';

/**
 * Authentication controller - handles all Better Auth routes
 * Better Auth provides a catch-all handler that manages all auth endpoints
 */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('BETTER_AUTH')
    private readonly auth: BetterAuthInstance,
  ) {}

  /**
   * Catch-all route handler for Better Auth
   * This handles all authentication-related requests:
   * - POST /auth/sign-up
   * - POST /auth/sign-in
   * - POST /auth/sign-out
   * - GET /auth/session
   * - POST /auth/update-user
   * - POST /auth/forget-password
   * - POST /auth/reset-password
   * - POST /auth/verify-email
   * And more...
   */
  @All('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Construct the full URL from the actual request
    // This ensures Better Auth sees the correct host (e.g., 192.168.8.8:3000 for mobile)
    const protocol = req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}${req.originalUrl}`;

    // Create a Web API Request from Express request
    const webRequest = new globalThis.Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Call Better Auth handler with the actual request
    const response = await this.auth.handler(webRequest);

    // Set headers from Better Auth response
    response.headers.forEach((value, key) => {
      if (key === 'set-cookie') {
        // Handle multiple Set-Cookie headers correctly
        const cookies =
          typeof response.headers.getSetCookie === 'function'
            ? response.headers.getSetCookie()
            : value;
        res.setHeader(key, cookies);
      } else {
        res.setHeader(key, value);
      }
    });

    // Send response
    res.status(response.status).send(await response.text());
  }
}
