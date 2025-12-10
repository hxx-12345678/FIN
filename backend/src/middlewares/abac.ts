/**
 * Attribute-Based Access Control (ABAC) Middleware
 * Implements fine-grained access control based on attributes
 * Complements RBAC with additional context-based checks
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ForbiddenError } from '../utils/errors';
import prisma from '../config/database';

interface ABACPolicy {
  resource: string;
  action: string;
  conditions: {
    role?: string[];
    orgId?: string;
    dataRegion?: string;
    timeOfDay?: { start: string; end: string };
    ipWhitelist?: string[];
    customAttributes?: Record<string, any>;
  };
}

// ABAC Policies
const ABAC_POLICIES: ABACPolicy[] = [
  {
    resource: 'model',
    action: 'create',
    conditions: {
      role: ['admin', 'finance'],
    },
  },
  {
    resource: 'model',
    action: 'delete',
    conditions: {
      role: ['admin'],
    },
  },
  {
    resource: 'export',
    action: 'download',
    conditions: {
      role: ['admin', 'finance', 'viewer'],
      // Additional: check if export belongs to user's org (enforced in controller)
    },
  },
  {
    resource: 'data',
    action: 'export',
    conditions: {
      role: ['admin'],
      // GDPR: only admins can export data
    },
  },
  {
    resource: 'data',
    action: 'delete',
    conditions: {
      role: ['admin'],
      // GDPR: only admins can delete data
    },
  },
  {
    resource: 'user',
    action: 'invite',
    conditions: {
      role: ['admin', 'finance'],
    },
  },
  {
    resource: 'user',
    action: 'remove',
    conditions: {
      role: ['admin'],
    },
  },
  {
    resource: 'settings',
    action: 'update',
    conditions: {
      role: ['admin'],
    },
  },
  {
    resource: 'connector',
    action: 'sync',
    conditions: {
      role: ['admin', 'finance'],
    },
  },
  {
    resource: 'monte_carlo',
    action: 'create',
    conditions: {
      role: ['admin', 'finance'],
    },
  },
];

/**
 * Check ABAC policy for resource and action
 */
export const abacCheck = async (
  req: AuthRequest,
  resource: string,
  action: string
): Promise<boolean> => {
  if (!req.user) return false;

  const userRole = (req as any).orgRole;
  const orgId = (req as any).orgId;

  if (!userRole || !orgId) {
    // Try to get from request params/body
    const extractedOrgId = req.params.orgId || req.params.org_id || req.body?.orgId || req.query?.org_id;
    if (extractedOrgId) {
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: extractedOrgId,
          },
        },
        select: { role: true },
      });
      if (!role) return false;
      (req as any).orgRole = role.role;
      (req as any).orgId = extractedOrgId;
    } else {
      return false;
    }
  }

  // Get org data region
  const org = await prisma.org.findUnique({
    where: { id: orgId || (req as any).orgId },
    select: { dataRegion: true },
  });

  // Find matching policy
  const policy = ABAC_POLICIES.find(
    p => p.resource === resource && p.action === action
  );

  if (!policy) {
    // Deny by default if no policy found
    return false;
  }

  // Check role
  if (policy.conditions.role && !policy.conditions.role.includes(userRole || (req as any).orgRole)) {
    return false;
  }

  // Check data region (if specified)
  if (policy.conditions.dataRegion && org?.dataRegion !== policy.conditions.dataRegion) {
    return false;
  }

  // Check IP whitelist (if configured)
  if (policy.conditions.ipWhitelist) {
    const clientIp = req.ip || req.socket.remoteAddress || 
      (Array.isArray(req.headers['x-forwarded-for']) 
        ? req.headers['x-forwarded-for'][0] 
        : req.headers['x-forwarded-for']) || '';
    if (!clientIp || !policy.conditions.ipWhitelist.includes(clientIp)) {
      return false;
    }
  }

  // Check time of day (if specified)
  if (policy.conditions.timeOfDay) {
    const now = new Date();
    const currentTime = `${now.getHours()}:${now.getMinutes()}`;
    const { start, end } = policy.conditions.timeOfDay;
    if (currentTime < start || currentTime > end) {
      return false;
    }
  }

  return true;
};

/**
 * Middleware factory: Require ABAC permission
 */
export const requireABAC = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const allowed = await abacCheck(req, resource, action);
      if (!allowed) {
        return next(new ForbiddenError(`Access denied for ${action} on ${resource}`));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Prevent privilege escalation
 * Ensures users cannot grant themselves or others higher privileges
 */
export const preventPrivilegeEscalation = async (
  actorUserId: string,
  targetUserId: string,
  orgId: string,
  requestedRole: string
): Promise<void> => {
  // Get actor's role
  const actorRole = await prisma.userOrgRole.findUnique({
    where: {
      userId_orgId: {
        userId: actorUserId,
        orgId,
      },
    },
    select: { role: true },
  });

  if (!actorRole) {
    throw new ForbiddenError('Actor has no access to this organization');
  }

  // Get target's current role
  const targetRole = await prisma.userOrgRole.findUnique({
    where: {
      userId_orgId: {
        userId: targetUserId,
        orgId,
      },
    },
    select: { role: true },
  });

  const roleLevels: Record<string, number> = {
    viewer: 1,
    finance: 2,
    admin: 3,
  };

  const actorLevel = roleLevels[actorRole.role] || 0;
  const requestedLevel = roleLevels[requestedRole] || 0;
  const targetLevel = targetRole ? roleLevels[targetRole.role] || 0 : 0;

  // Prevent escalation: actor cannot grant role higher than their own
  if (requestedLevel > actorLevel) {
    throw new ForbiddenError('Cannot grant role higher than your own');
  }

  // Prevent escalation: actor cannot grant admin role if they're not admin
  if (requestedRole === 'admin' && actorRole.role !== 'admin') {
    throw new ForbiddenError('Only admins can grant admin role');
  }

  // Prevent self-escalation
  if (actorUserId === targetUserId && requestedLevel > actorLevel) {
    throw new ForbiddenError('Cannot escalate your own privileges');
  }

  // Prevent demoting last admin
  if (targetRole?.role === 'admin' && requestedRole !== 'admin') {
    const adminCount = await prisma.userOrgRole.count({
      where: {
        orgId,
        role: 'admin',
      },
    });

    if (adminCount === 1) {
      throw new ForbiddenError('Cannot remove the last admin from the organization');
    }
  }
};

