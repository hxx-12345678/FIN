import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface ShareTokenRequest extends Request {
  shareToken?: {
    id: string;
    orgId: string;
    scope: string;
    expiresAt: Date | null;
  };
}

/**
 * Share token authentication middleware
 * Allows read-only access via share tokens
 */
export const authenticateShareToken = async (
  req: ShareTokenRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for share token in query or header
    const token =
      (req.query.token as string) ||
      (req.headers['x-share-token'] as string) ||
      (req.headers.authorization?.startsWith('ShareToken ')
        ? req.headers.authorization.substring(11)
        : null);

    if (!token) {
      throw new UnauthorizedError('Share token required');
    }

    // Find share token
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      throw new UnauthorizedError('Invalid share token');
    }

    // Check expiration
    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Share token has expired');
    }

    // Attach to request
    req.shareToken = {
      id: shareToken.id,
      orgId: shareToken.orgId,
      scope: shareToken.scope,
      expiresAt: shareToken.expiresAt,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if share token has required scope
 */
export const requireShareTokenScope = (requiredScope: string) => {
  return (req: ShareTokenRequest, res: Response, next: NextFunction) => {
    if (!req.shareToken) {
      throw new UnauthorizedError('Share token required');
    }

    // For now, only 'read-only' scope is supported
    if (req.shareToken.scope !== requiredScope) {
      throw new ForbiddenError(`Share token does not have required scope: ${requiredScope}`);
    }

    next();
  };
};


