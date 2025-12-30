import prisma from '../config/database';
import { randomBytes } from 'crypto';
import { ValidationError, NotFoundError } from '../utils/errors';
import { realtimeSimulationService } from './realtime-simulation.service';

/**
 * BOARD SCENARIO SERVICE
 * Handles "freezing" a decision state into a permanent board-ready snapshot.
 * This ensures the board sees a stable "truth" while still allowing them to
 * toggle specific parameters if the CFO allows.
 */
export const boardScenarioService = {
  /**
   * Create a snapshot from an existing simulation or hypothetical change
   */
  createSnapshot: async (
    userId: string,
    orgId: string,
    params: any,
    name: string,
    description?: string
  ) => {
    // 1. Generate a unique, non-guessable token for the share link
    const token = `snapshot_${randomBytes(24).toString('hex')}`;

    // 2. Generate results for the snapshot to "freeze" them
    // We reuse the simulation logic to get the numbers
    const initialValues = await realtimeSimulationService.getInitialValuesFromModel(orgId);
    const results = realtimeSimulationService.generateSimulation(
      params,
      initialValues.customers,
      initialValues.revenue,
      initialValues.expenses,
      initialValues.cashBalance
    );

    // 3. Save as a snapshot simulation
    const snapshot = await prisma.realtimeSimulation.create({
      data: {
        orgId,
        userId,
        name,
        paramsJson: params,
        resultsJson: results as any,
        isSnapshot: true,
        snapshotToken: token,
      }
    });

    return {
      id: snapshot.id,
      token: snapshot.snapshotToken,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/board/snapshot/${token}`,
      createdAt: snapshot.createdAt
    };
  },

  /**
   * Retrieve a snapshot by its public token (No Auth required if token matches)
   */
  getSnapshotByToken: async (token: string) => {
    const snapshot = await prisma.realtimeSimulation.findUnique({
      where: { snapshotToken: token },
      include: {
        org: {
          select: {
            name: true,
            currency: true
          }
        }
      }
    });

    if (!snapshot || !snapshot.isSnapshot) {
      throw new NotFoundError('Board snapshot not found or expired');
    }

    return {
      name: snapshot.name,
      orgName: snapshot.org.name,
      currency: snapshot.org.currency,
      params: snapshot.paramsJson,
      results: snapshot.resultsJson,
      createdAt: snapshot.createdAt
    };
  }
};


