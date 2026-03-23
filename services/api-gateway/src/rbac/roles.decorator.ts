import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator that sets the minimum required role for a route.
 * Role hierarchy: owner > admin > developer > operator > viewer
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
