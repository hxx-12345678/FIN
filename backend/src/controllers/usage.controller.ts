/**
 * Usage Controller
 * Handles HTTP requests for simulation credit usage tracking
 */

import { Request, Response, NextFunction } from 'express';
import { simulationCreditService } from '../services/simulation-credit.service';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/database';

export const usageController = {
  /**
   * GET /usage
   * Get usage summary for organization
   */
  getUsage: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const { orgId } = req.query;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const userId = req.query.userId as string | undefined;

      if (!orgId || typeof orgId !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'orgId query parameter is required',
          },
        });
        return;
      }

      // Verify user has access to org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: orgId as string,
          },
        },
      });

      if (!role) {
        res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'No access to this organization',
          },
        });
        return;
      }

      // Get usage summary
      const summary = await simulationCreditService.getUsageSummary(
        orgId as string,
        userId || req.user.id,
        startDate,
        endDate
      );

      res.status(200).json({
        ok: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error(`Error getting usage: ${error.message}`, error);
      next(error);
    }
  },

  /**
   * GET /usage/balance
   * Get current credit balance
   */
  getBalance: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const { orgId } = req.query;

      if (!orgId || typeof orgId !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'orgId query parameter is required',
          },
        });
        return;
      }

      // Verify user has access to org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: orgId as string,
          },
        },
      });

      if (!role) {
        res.status(403).json({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'No access to this organization',
          },
        });
        return;
      }

      // Get credit balance
      const balance = await simulationCreditService.getCreditBalance(orgId as string);

      res.status(200).json({
        ok: true,
        data: balance,
      });
    } catch (error: any) {
      logger.error(`Error getting credit balance: ${error.message}`, error);
      next(error);
    }
  },

  /**
   * POST /usage/admin/add-credits
   * Admin override: Add credits manually
   */
  adminAddCredits: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          },
        });
        return;
      }

      const { orgId, credits, reason } = req.body;

      if (!orgId || typeof orgId !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'orgId is required',
          },
        });
        return;
      }

      if (!credits || typeof credits !== 'number' || credits <= 0) {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'credits must be a positive number',
          },
        });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'reason is required',
          },
        });
        return;
      }

      // Add credits (service will verify admin access)
      const usage = await simulationCreditService.adminAddCredits(
        orgId,
        req.user.id,
        credits,
        reason
      );

      // Get updated balance
      const balance = await simulationCreditService.getCreditBalance(orgId);

      res.status(200).json({
        ok: true,
        data: {
          usage,
          balance,
        },
      });
    } catch (error: any) {
      logger.error(`Error adding credits: ${error.message}`, error);
      next(error);
    }
  },
};


