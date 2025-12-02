import { Response, NextFunction } from 'express';
import { shareTokenService } from '../services/shareToken.service';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';
import { ShareTokenRequest } from '../middlewares/shareToken';

export const shareTokenController = {
  /**
   * POST /api/v1/orgs/:orgId/share-tokens - Create share token
   */
  createShareToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { expiresInDays, scope } = req.body;

      const shareToken = await shareTokenService.createShareToken(
        orgId,
        req.user.id,
        {
          expiresInDays: expiresInDays || 30,
          scope: scope || 'read-only',
        }
      );

      res.status(201).json({
        ok: true,
        shareToken: {
          id: shareToken.id,
          token: shareToken.token,
          expiresAt: shareToken.expiresAt,
          scope: shareToken.scope,
          shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken.token}`,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/share-tokens - List share tokens
   */
  listShareTokens: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const tokens = await shareTokenService.listShareTokens(orgId, req.user.id);

      res.json({
        ok: true,
        tokens: tokens.map((t) => ({
          id: t.id,
          expiresAt: t.expiresAt,
          scope: t.scope,
          createdAt: t.createdAt,
          // Don't return token value for security
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/share-tokens/:tokenId - Revoke share token
   */
  revokeShareToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { tokenId } = req.params;
      await shareTokenService.revokeShareToken(tokenId, req.user.id);

      res.json({
        ok: true,
        message: 'Share token revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/share/:token - Get shared data (read-only access)
   */
  getSharedData: async (req: ShareTokenRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.shareToken) {
        throw new ValidationError('Share token required');
      }

      const { token } = req.params;
      const { type } = req.query; // model|modelRun|montecarlo|export

      const data = await shareTokenService.getSharedData(
        token,
        type as string
      );

      res.json({
        ok: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};


