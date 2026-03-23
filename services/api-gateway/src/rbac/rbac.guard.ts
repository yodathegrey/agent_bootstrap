import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

/**
 * Role hierarchy from highest to lowest privilege.
 * A user with a higher role automatically satisfies lower role requirements.
 */
const ROLE_HIERARCHY: string[] = [
  'owner',
  'admin',
  'developer',
  'operator',
  'viewer',
];

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User has no assigned role');
    }

    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
    if (userRoleIndex === -1) {
      throw new ForbiddenException(`Unknown role: ${user.role}`);
    }

    // Check if the user's role is at or above any of the required roles
    const hasPermission = requiredRoles.some((requiredRole) => {
      const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
      return requiredIndex !== -1 && userRoleIndex <= requiredIndex;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Role '${user.role}' does not have sufficient permissions. Required: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
