import { Request, Response, NextFunction } from 'express';
import { connectorService } from '../services/connector.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const connectorController = {
  /**
   * POST /api/v1/connectors/orgs/:orgId/connectors/stripe/connect
   * Configure Stripe connector using API key (no OAuth)
   */
  connectStripe: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { stripeSecretKey } = req.body || {};

      if (!orgId) {
        throw new ValidationError('orgId is required');
      }

      const result = await connectorService.connectStripeApiKey(orgId, req.user.id, stripeSecretKey);
      res.status(201).json({ ok: true, data: result });
    } catch (e) {
      next(e);
    }
  },
  startOAuth: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, type } = req.params;

      if (!orgId || !type) {
        throw new ValidationError('orgId and type are required');
      }

      try {
        const result = await connectorService.startOAuth(orgId, type as any, req.user.id);

        res.json({
          ok: true,
          data: {
            connectorId: result.connectorId,
            authUrl: result.authUrl,
          },
        });
      } catch (serviceError: any) {
        // Provide more detailed error messages
        if (serviceError.message?.includes('credentials not configured')) {
          throw new ValidationError(`${type.toUpperCase()} OAuth credentials are missing. Please configure ${type.toUpperCase()}_CLIENT_ID and ${type.toUpperCase()}_CLIENT_SECRET in your .env file.`);
        }
        throw serviceError;
      }
    } catch (error) {
      next(error);
    }
  },

  oauthCallback: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state, realmId, error, error_description } = req.query;

      // Check for OAuth errors from provider
      if (error) {
        const { config } = await import('../config/env');
        const errorMsg = error_description || error;
        res.redirect(`${config.frontendUrl}/integrations?error=${encodeURIComponent(errorMsg as string)}`);
        return;
      }

      if (!code || !state) {
        throw new ValidationError('code and state are required');
      }

      // Pass realmId if available (QuickBooks specific)
      const result = await connectorService.handleOAuthCallback(
        undefined, // connectorId will be extracted from state token
        code as string,
        state as string,
        realmId as string | undefined
      );

      // Redirect to frontend success page
      const { config } = await import('../config/env');
      res.redirect(`${config.frontendUrl}/integrations?success=true&connectorId=${result.connectorId}`);
    } catch (error) {
      const { config } = await import('../config/env');
      const errorMsg = error instanceof Error ? error.message : 'OAuth callback failed';
      res.redirect(`${config.frontendUrl}/integrations?error=${encodeURIComponent(errorMsg)}`);
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

