import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Get user role from Better Auth session
    // The admin plugin stores role in user.role field
    const userRole = user.role || UserRole.USER;

    // Check if user has any of the required roles
    // Better Auth supports multiple roles separated by comma
    const userRoles = userRole.split(',').map((r: string) => r.trim());

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
