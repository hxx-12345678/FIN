import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UnauthorizedError, ForbiddenError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { isValidUUID } from '../utils/validation';
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
  // Guard against invalid UUIDs to prevent Prisma crashes
  if (!isValidUUID(userId) || !isValidUUID(orgId)) {
    return null;
  }

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
 * Usage: requireOrgAccess('orgId', 'finance')
 */
export const requireOrgAccess = (orgIdParam: string = 'orgId', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const orgId = req.params[orgIdParam] || req.body?.orgId || req.query?.org_id || req.body?.[orgIdParam];

      if (!orgId || typeof orgId !== 'string') {
        throw new ForbiddenError('Organization ID required');
      }

      if (!isValidUUID(orgId)) {
        throw new ValidationError('Invalid Organization ID format');
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

      if (!isValidUUID(orgId)) {
        throw new ValidationError('Invalid Organization ID format');
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
 * Middleware factory: Require ownership of a specific model
 */
export const requireModelOwnership = (modelIdParam: string = 'modelId', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const modelId = req.params[modelIdParam] || req.body?.[modelIdParam] || req.query?.[modelIdParam];
      if (!modelId || typeof modelId !== 'string') {
        throw new ForbiddenError('Model ID required');
      }

      const model = await prisma.model.findUnique({
        where: { id: modelId },
        select: { orgId: true }
      });

      if (!model) {
        throw new UnauthorizedError('Model not found');
      }

      const role = await getUserOrgRole(req.user.id, model.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this model (Ownership check failed)');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      (req as any).orgId = model.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require ownership of a specific model run
 */
export const requireRunOwnership = (runIdParam: string = 'runId', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const runId = req.params[runIdParam] || req.body?.[runIdParam] || req.query?.[runIdParam];
      if (!runId || typeof runId !== 'string') {
        throw new ForbiddenError('Run ID required');
      }

      const run = await prisma.modelRun.findUnique({
        where: { id: runId },
        select: { orgId: true }
      });

      if (!run) {
        throw new UnauthorizedError('Model run not found');
      }

      const role = await getUserOrgRole(req.user.id, run.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this model run (Ownership check failed)');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      (req as any).orgId = run.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};


/**
 * Middleware factory: Require ownership of a specific connector
 */
export const requireConnectorOwnership = (connectorIdParam: string = 'id', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const connectorId = req.params[connectorIdParam] || req.body?.[connectorIdParam] || req.query?.[connectorIdParam];
      if (!connectorId || typeof connectorId !== 'string') {
        throw new ForbiddenError('Connector ID required');
      }

      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        select: { orgId: true }
      });

      if (!connector) {
        throw new UnauthorizedError('Connector not found');
      }

      const role = await getUserOrgRole(req.user.id, connector.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this connector');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      (req as any).orgId = connector.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require ownership of a specific AI plan
 */
export const requirePlanOwnership = (planIdParam: string = 'planId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const planId = req.params[planIdParam] || req.body?.[planIdParam] || req.query?.[planIdParam];
      if (!planId || typeof planId !== 'string') {
        throw new ForbiddenError('Plan ID required');
      }

      const plan = await prisma.aICFOPlan.findUnique({
        where: { id: planId },
        select: { orgId: true }
      });

      if (!plan) {
        throw new UnauthorizedError('Plan not found');
      }

      const role = await getUserOrgRole(req.user.id, plan.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this AI plan');
      }

      (req as any).orgId = plan.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require ownership of a specific prompt (for audibility)
 */
export const requirePromptOwnership = (promptIdParam: string = 'promptId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const promptId = req.params[promptIdParam] || req.body?.[promptIdParam] || req.query?.[promptIdParam];
      if (!promptId || typeof promptId !== 'string') {
        throw new ForbiddenError('Prompt ID required');
      }

      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: { orgId: true }
      });

      if (!prompt) {
        throw new UnauthorizedError('Prompt record not found');
      }

      if (!prompt.orgId) {
        // Platform or global prompt - allow platform admins only if it has no orgId
        // Or check if user is a platform admin (logic already exists in requirePlatformAdmin)
        await requirePlatformAdmin(req, res, next);
        return;
      }

      const role = await getUserOrgRole(req.user.id, prompt.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this prompt record');
      }

      (req as any).orgId = prompt.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require ownership of a specific share token
 */
export const requireShareTokenOwnership = (tokenIdParam: string = 'tokenId', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tokenId = req.params[tokenIdParam] || req.body?.[tokenIdParam] || req.query?.[tokenIdParam];
      if (!tokenId || typeof tokenId !== 'string') {
        throw new ForbiddenError('Share Token ID required');
      }

      const token = await prisma.shareToken.findUnique({
        where: { id: tokenId },
        select: { orgId: true }
      });

      if (!token) {
        throw new UnauthorizedError('Share token not found');
      }

      const role = await getUserOrgRole(req.user.id, token.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this share token');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      (req as any).orgId = token.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require ownership of a specific job (generic)
 * jobId can be jobs.id or monte_carlo_jobs.id
 */
export const requireJobOwnership = (jobIdParam: string = 'jobId', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const jobId = req.params[jobIdParam] || req.body?.[jobIdParam] || req.query?.[jobIdParam];
      if (!jobId || typeof jobId !== 'string') {
        throw new ForbiddenError('Job ID required');
      }

      // Try MonteCarloJob first (as it's high value)
      let orgId: string | null = null;

      const mcJob = await prisma.monteCarloJob.findUnique({
        where: { id: jobId },
        select: { orgId: true }
      });

      if (mcJob) {
        orgId = mcJob.orgId;
      } else {
        // Try regular Job
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: { orgId: true }
        });
        if (job) {
          orgId = job.orgId;
        }
      }

      if (!orgId) {
        // If not found in either, it might be an invalid ID or not a job
        throw new UnauthorizedError('Job not found');
      }

      const role = await getUserOrgRole(req.user.id, orgId);
      if (!role) {
        throw new ForbiddenError('No access to this job');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      (req as any).orgId = orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware factory: Require ownership of a specific export
 */
export const requireExportOwnership = (exportIdParam: string = 'exportId', minRole: 'viewer' | 'finance' | 'admin' = 'viewer') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const exportId = req.params[exportIdParam] || req.body?.[exportIdParam] || req.query?.[exportIdParam];
      if (!exportId || typeof exportId !== 'string') {
        throw new ForbiddenError('Export ID required');
      }

      const exp = await prisma.export.findUnique({
        where: { id: exportId },
        select: { orgId: true }
      });

      if (!exp) {
        throw new UnauthorizedError('Export not found');
      }

      const role = await getUserOrgRole(req.user.id, exp.orgId);
      if (!role) {
        throw new ForbiddenError('No access to this export');
      }

      if (!hasMinimumRole(role, minRole)) {
        throw new ForbiddenError(
          `This action requires ${minRole} role or higher. You have: ${role}`
        );
      }

      (req as any).orgId = exp.orgId;
      (req as any).orgRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Utility: Validate UUID format
 */

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
