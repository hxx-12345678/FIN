/**
 * Real-time Simulation Controller
 * API endpoints for real-time financial simulations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { realtimeSimulationService } from '../services/realtime-simulation.service';
import { ValidationError } from '../utils/errors';

export const realtimeSimulationController = {
  /**
   * GET /api/v1/orgs/:orgId/realtime-simulations
   * Get or create simulation for organization
   */
  getSimulation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { simulationId, name } = req.query;

      let simulation;
      if (simulationId && typeof simulationId === 'string') {
        simulation = await realtimeSimulationService.getSimulation(
          req.user.id,
          orgId,
          simulationId
        );
      } else {
        simulation = await realtimeSimulationService.getOrCreateSimulation(
          req.user.id,
          orgId,
          typeof name === 'string' ? name : undefined
        );
      }

      res.json({
        ok: true,
        simulation,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/realtime-simulations
   * Create or update simulation
   */
  createOrUpdateSimulation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { simulationId, params, name, currentMonth, isRunning } = req.body;

      if (!params || typeof params !== 'object') {
        throw new ValidationError('Simulation parameters are required');
      }

      const simulation = await realtimeSimulationService.updateSimulation(
        req.user.id,
        orgId,
        simulationId || 'new',
        params,
        name,
        currentMonth,
        isRunning
      );

      res.json({
        ok: true,
        simulation,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/orgs/:orgId/realtime-simulations/:simulationId/run
   * Start or stop simulation
   */
  toggleSimulation: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, simulationId } = req.params;
      const { isRunning, currentMonth } = req.body;

      // Get simulation
      const simulation = await realtimeSimulationService.getSimulation(
        req.user.id,
        orgId,
        simulationId
      );

      // In production, update in database
      // For now, return updated simulation
      res.json({
        ok: true,
        simulation: {
          ...simulation,
          isRunning: isRunning !== undefined ? isRunning : !simulation.isRunning,
          currentMonth: currentMonth !== undefined ? currentMonth : simulation.currentMonth,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/realtime-simulations/initial-values
   * Get initial values from latest model run
   */
  getInitialValues: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;

      const values = await realtimeSimulationService.getInitialValuesFromModel(orgId);

      res.json({
        ok: true,
        values,
      });
    } catch (error) {
      next(error);
    }
  },
};


