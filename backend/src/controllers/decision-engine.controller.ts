import { Request, Response, NextFunction } from 'express';
import { decisionEngineService, HypotheticalChange } from '../services/decision-engine.service';
import { boardScenarioService } from '../services/board-scenario.service';
import { auditService } from '../services/audit.service';
import { ValidationError } from '../utils/errors';

/**
 * DECISION ENGINE CONTROLLER
 * Handles requests for instant financial impact analysis and snapshots
 */
export const decisionEngineController = {
  /**
   * Get instant impact of a hypothetical change
   */
  getImpact: async (req: Request, res: Response, next: NextFunction) => {
    // ... existing getImpact code ...
    try {
      const { orgId } = req.params;
      const userId = (req as any).user?.id;
      const change = req.body as HypotheticalChange;

      if (!orgId) {
        throw new ValidationError('Organization ID is required');
      }

      if (Object.keys(change).length === 0) {
        throw new ValidationError('At least one hypothetical change parameter is required');
      }

      const impact = await decisionEngineService.calculateInstantImpact(orgId, change);

      await auditService.log({
        actorUserId: userId,
        orgId,
        action: 'decision_impact_checked',
        metaJson: { change, impact }
      });

      res.status(200).json({ ok: true, data: impact });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a permanent board-ready snapshot from a decision
   */
  createSnapshot: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId } = req.params;
      const userId = (req as any).user?.id;
      const { params, name, description } = req.body;

      if (!name) {
        throw new ValidationError('Snapshot name is required');
      }

      const snapshot = await boardScenarioService.createSnapshot(
        userId,
        orgId,
        params,
        name,
        description
      );

      await auditService.log({
        actorUserId: userId,
        orgId,
        action: 'board_snapshot_created',
        objectId: snapshot.id,
        metaJson: { name, params }
      });

      res.status(201).json({
        ok: true,
        data: snapshot
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get snapshot by public token (Public API)
   */
  getPublicSnapshot: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const snapshot = await boardScenarioService.getSnapshotByToken(token);

      res.status(200).json({
        ok: true,
        data: snapshot
      });
    } catch (error) {
      next(error);
    }
  }
};

