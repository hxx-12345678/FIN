import { Response, NextFunction } from 'express';
import { scenarioService } from '../services/scenario.service';
import { AuthRequest } from '../middlewares/auth';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export const scenarioController = {
  /**
   * POST /api/v1/models/:model_id/scenarios
   * orgId optional - gets from user's primary org if not provided
   */
  createScenario: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id: modelId } = req.params;
      const { org_id: queryOrgId } = req.query;

      if (!modelId) {
        throw new ValidationError('model_id is required');
      }

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        // Get user's primary org
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
          include: { org: true },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      const result = await scenarioService.createScenario(
        req.user.id,
        orgId,
        modelId,
        req.body
      );

      res.status(201).json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/models/:model_id/scenarios
   * orgId optional - gets from user's primary org if not provided
   */
  getScenarios: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id: modelId } = req.params;
      const { org_id: queryOrgId } = req.query;

      if (!modelId) {
        throw new ValidationError('model_id is required');
      }

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        // Get user's primary org
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
          include: { org: true },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      const scenarios = await scenarioService.getScenarios(
        req.user.id,
        orgId,
        modelId
      );

      res.json({
        ok: true,
        scenarios,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/scenarios/:run_id/comparison
   * orgId optional - gets from user's primary org if not provided
   */
  getScenarioComparison: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { run_id: runId } = req.params;
      const { org_id: queryOrgId } = req.query;

      if (!runId) {
        throw new ValidationError('run_id is required');
      }

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        // Get user's primary org
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
          include: { org: true },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      const comparison = await scenarioService.getScenarioComparison(
        req.user.id,
        orgId,
        runId
      );

      res.json({
        ok: true,
        ...comparison,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/scenarios/:run_id
   * Update scenario metadata and overrides
   */
  updateScenario: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { run_id: runId } = req.params;
      const { org_id: queryOrgId } = req.query;

      if (!runId) {
        throw new ValidationError('run_id is required');
      }

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      const result = await scenarioService.updateScenario(
        req.user.id,
        orgId,
        runId,
        req.body
      );

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/scenarios/:run_id
   * Delete a scenario
   */
  deleteScenario: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { run_id: runId } = req.params;
      const { org_id: queryOrgId } = req.query;

      if (!runId) {
        throw new ValidationError('run_id is required');
      }

      // Get orgId from query param or user's primary org
      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
        });

        if (!userRole) {
          throw new ValidationError('orgId is required. User has no organization access.');
        }

        orgId = userRole.orgId;
      }

      await scenarioService.deleteScenario(
        req.user.id,
        orgId,
        runId
      );

      res.json({
        ok: true,
        message: 'Scenario deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/scenarios/:run_id/promote
   * Promote scenario assumptions to base model
   */
  promoteScenario: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { run_id: runId } = req.params;
      const { org_id: queryOrgId } = req.query;

      if (!runId) {
        throw new ValidationError('run_id is required');
      }

      let orgId: string;
      if (queryOrgId && typeof queryOrgId === 'string') {
        orgId = queryOrgId;
      } else {
        const userRole = await prisma.userOrgRole.findFirst({
          where: { userId: req.user.id },
        });
        if (!userRole) {
          throw new ValidationError('orgId is required');
        }
        orgId = userRole.orgId;
      }

      const result = await scenarioService.promoteScenario(
        req.user.id,
        orgId,
        runId
      );

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },
};
