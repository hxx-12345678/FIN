import { Request, Response, NextFunction } from 'express';
import { connectorService } from '../services/connector.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const connectorController = {
  startOAuth: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, type } = req.params;

      if (!orgId || !type) {
        throw new ValidationError('orgId and type are required');
      }

      const result = await connectorService.startOAuth(orgId, type as any, req.user.id);

      res.json({
        ok: true,
        data: {
          connectorId: result.connectorId,
          authUrl: result.authUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  oauthCallback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        throw new ValidationError('code and state are required');
      }

      const result = await connectorService.handleOAuthCallback(
        undefined, // connectorId will be extracted from state token
        code as string,
        state as string
      );

      // Redirect to frontend success page
      const { config } = await import('../config/env');
      res.redirect(`${config.frontendUrl}/connectors/${result.connectorId}/success`);
    } catch (error) {
      next(error);
    }
  },

  sync: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: connectorId } = req.params;

      const result = await connectorService.sync(connectorId, req.user.id);

      res.json({
        ok: true,
        data: {
          jobId: result.jobId,
          status: result.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id: connectorId } = req.params;

      const result = await connectorService.getStatus(connectorId, req.user.id);

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  listConnectors: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      const connectors = await connectorService.listConnectors(orgId, req.user.id);

      res.json({
        ok: true,
        data: connectors,
      });
    } catch (error) {
      next(error);
    }
  },
};

