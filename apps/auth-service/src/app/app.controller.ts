import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        session: '/api/auth/session',
        signUp: '/api/auth/sign-up',
        signIn: '/api/auth/sign-in',
        signOut: '/api/auth/sign-out',
      },
    };
  }

  @Get('auth-info')
  getAuthInfo() {
    return {
      message: 'Better Auth Endpoints',
      baseUrl: '/api/auth',
      availableEndpoints: [
        {
          path: '/api/auth/session',
          method: 'GET',
          description: 'Get current session',
          example: 'curl http://localhost:3000/api/auth/session',
        },
        {
          path: '/api/auth/sign-up',
          method: 'POST',
          description: 'Create new account',
          example:
            'curl -X POST http://localhost:3000/api/auth/sign-up -H "Content-Type: application/json" -d \'{"email":"test@example.com","password":"password123","name":"Test User"}\'',
        },
        {
          path: '/api/auth/sign-in',
          method: 'POST',
          description: 'Sign in to account',
          example:
            'curl -X POST http://localhost:3000/api/auth/sign-in -H "Content-Type: application/json" -d \'{"email":"test@example.com","password":"password123"}\'',
        },
        {
          path: '/api/auth/sign-out',
          method: 'POST',
          description: 'Sign out of account',
          example: 'curl -X POST http://localhost:3000/api/auth/sign-out',
        },
      ],
      note: 'Use /api/auth/session (not /api/get-session)',
    };
  }
}
