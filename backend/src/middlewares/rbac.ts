import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';

/**
 * Role hierarchy: admin > finance > viewer
 */
const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  finance: 2,
  admin: 3,
};

/**
 * Get user's role for a specific org
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<string | null> {
  const role = await prisma.userOrgRole.findUnique({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
    select: { role: true },
  });

  return role?.role || null;
}

/**
 * Check if user has minimum required role level
 */
function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 999;
  return userLevel >= requiredLevel;
}

/**
 * Middleware: Require user to be authenticated
 * (This is redundant with authenticate middleware, but explicit for clarity)
 */
export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  next();
};

/**
 * Middleware factory: Require user to have access to specified org
 * Usage: requireOrgAccess('orgId')
 */
export const requireOrgAccess = (orgIdParam: string = 'orgId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const orgId = req.params[orgIdParam] || req.body?.orgId || req.query?.org_id;

      if (!orgId || typeof orgId !== 'string') {
        throw new ForbiddenError('Organization ID required');
      }

      const role = await getUserOrgRole(req.user.id, orgId);

      if (!role) {
        throw new ForbiddenError('No access to this organization');
      }

      // Attach role to request for downstream use
      (req as any).orgRole = role;
      (req as any).orgId = orgId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require minimum role level for org
 * Usage: requireOrgRole('finance', 'orgId')
 */
export const requireOrgRole = (
  minRole: 'viewer' | 'finance' | 'admin',
  orgIdParam: string = 'orgId'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const orgId = req.params[orgIdParam] || req.body?.orgId || req.query?.org_id;

      if (!orgId || typeof orgId !== 'string') {
        throw new ForbiddenError('Organization ID required');
      }

      const role = await getUserOrgRole(req.user.id, orgId);

      if (!role) {
        throw new ForbiddenError('No access to this organization');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      // Attach role to request for downstream use
      (req as any).orgRole = role;
      (req as any).orgId = orgId;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require finance or admin role
 */
export const requireFinanceOrAdmin = (orgIdParam: string = 'orgId') => {
  return requireOrgRole('finance', orgIdParam);
};

/**
 * Middleware: Require admin role
 */
export const requireAdmin = (orgIdParam: string = 'orgId') => {
  return requireOrgRole('admin', orgIdParam);
};

/**
 * Middleware: Check if user is platform admin (for system-wide admin endpoints)
 * Note: This requires a separate `is_platform_admin` flag on User model or similar
 * For now, we'll check if user has admin role in ANY org as a proxy
 */
export const requirePlatformAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has admin role in any org
    const adminRoles = await prisma.userOrgRole.findMany({
      where: {
        userId: req.user.id,
        role: 'admin',
      },
      select: { orgId: true },
    });

    if (adminRoles.length === 0) {
      throw new ForbiddenError('Platform admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Utility: Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Middleware: Validate UUID params
 * Usage: validateUUIDParams(['orgId', 'modelId'])
 */
export const validateUUIDParams = (paramNames: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value && !isValidUUID(value)) {
        return next(
          new ForbiddenError(`Invalid UUID format for parameter: ${paramName}`)
        );
      }
    }
    next();
  };
};
