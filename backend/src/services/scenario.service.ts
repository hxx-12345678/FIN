/**
 * SCENARIO ENGINE SERVICE
 * Handles deterministic scenario runs with overrides
 * Returns delta vs base case
 */

import prisma from '../config/database';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { jobService } from './job.service';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

export type ScenarioType = 'baseline' | 'optimistic' | 'conservative' | 'adhoc';

export interface CreateScenarioRequest {
  name?: string;
  scenarioType: ScenarioType;
  overrides: {
    revenue?: {
      growth?: number;
      churn?: number;
      baseline?: number;
    };
    costs?: {
      growth?: number;
      baseline?: number;
      payroll?: number;
      marketing?: number;
    };
    cash?: {
      initial?: number;
    };
    [key: string]: any;
  };
}

export interface ScenarioResult {
  modelRunId: string;
  jobId: string;
  scenarioType: ScenarioType;
  overrides: Record<string, any>;
  baselineRunId?: string;
}

export const scenarioService = {
  /**
   * Create a scenario run
   */
  createScenario: async (
    userId: string,
    orgId: string,
    modelId: string,
    request: CreateScenarioRequest
  ): Promise<ScenarioResult> => {
    // Validate model exists
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: { orgId: true, name: true },
    });

    if (!model) {
      throw new NotFoundError('Model not found');
    }

    if (model.orgId !== orgId) {
      throw new ForbiddenError('Model does not belong to this organization');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can create scenarios');
    }

    // Validate scenario type
    const validTypes: ScenarioType[] = ['baseline', 'optimistic', 'conservative', 'adhoc'];
    if (!validTypes.includes(request.scenarioType)) {
      throw new ValidationError(`scenarioType must be one of: ${validTypes.join(', ')}`);
    }

    // Get baseline run for comparison
    const baselineRun = await prisma.modelRun.findFirst({
      where: {
        modelId,
        orgId,
        runType: 'baseline',
        status: 'done',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    // Build scenario name
    const scenarioName = request.name ||
      `${request.scenarioType.charAt(0).toUpperCase() + request.scenarioType.slice(1)} Scenario - ${new Date().toLocaleDateString()}`;

    // Create model run for scenario
    const modelRun = await prisma.modelRun.create({
      data: {
        modelId,
        orgId,
        runType: 'scenario',
        paramsJson: {
          scenarioType: request.scenarioType,
          scenarioName,
          overrides: request.overrides,
          baselineRunId: baselineRun?.id,
          createdAt: new Date().toISOString(),
        },
        status: 'queued',
      },
    });

    // Create job for Python worker
    const job = await jobService.createJob({
      jobType: 'model_run',
      orgId,
      objectId: modelRun.id,
      createdByUserId: userId,
      params: {
        modelRunId: modelRun.id,
        modelId,
        runType: 'scenario',
        paramsJson: {
          scenarioType: request.scenarioType,
          overrides: request.overrides,
          baselineRunId: baselineRun?.id,
        },
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'scenario_created',
      objectType: 'model_run',
      objectId: modelRun.id,
      metaJson: {
        scenarioType: request.scenarioType,
        scenarioName,
        modelId,
        baselineRunId: baselineRun?.id,
      },
    });

    return {
      modelRunId: modelRun.id,
      jobId: job.id,
      scenarioType: request.scenarioType,
      overrides: request.overrides,
      baselineRunId: baselineRun?.id,
    };
  },

  /**
   * Get scenario comparison (delta vs baseline)
   */
  getScenarioComparison: async (
    userId: string,
    orgId: string,
    scenarioRunId: string
  ): Promise<{
    scenario: any;
    baseline: any;
    delta: {
      revenue: number;
      expenses: number;
      netIncome: number;
      burnRate: number;
      runwayMonths: number;
      [key: string]: any;
    };
  }> => {
    // Get scenario run
    const scenarioRun = await prisma.modelRun.findUnique({
      where: { id: scenarioRunId },
      include: {
        model: {
          select: { orgId: true },
        },
      },
    });

    if (!scenarioRun) {
      throw new NotFoundError('Scenario run not found');
    }

    if (scenarioRun.orgId !== orgId) {
      throw new ForbiddenError('Scenario does not belong to this organization');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this scenario');
    }

    if (scenarioRun.status !== 'done' || !scenarioRun.summaryJson) {
      throw new ValidationError('Scenario run is not completed yet');
    }

    // Get baseline run
    const paramsJson = scenarioRun.paramsJson as any;
    const baselineRunId = paramsJson?.baselineRunId;

    let baselineRun = null;
    if (baselineRunId) {
      baselineRun = await prisma.modelRun.findUnique({
        where: { id: baselineRunId },
        select: { summaryJson: true },
      });
    }

    // If no baseline specified, get latest baseline
    if (!baselineRun) {
      baselineRun = await prisma.modelRun.findFirst({
        where: {
          modelId: scenarioRun.modelId,
          orgId,
          runType: 'baseline',
          status: 'done',
        },
        orderBy: { createdAt: 'desc' },
        select: { summaryJson: true },
      });
    }

    const scenarioSummary = scenarioRun.summaryJson as any;
    const baselineSummary = baselineRun?.summaryJson as any || {};

    // Calculate delta
    const delta = {
      revenue: (scenarioSummary.totalRevenue || 0) - (baselineSummary.totalRevenue || 0),
      expenses: (scenarioSummary.totalExpenses || 0) - (baselineSummary.totalExpenses || 0),
      netIncome: (scenarioSummary.netIncome || 0) - (baselineSummary.netIncome || 0),
      burnRate: (scenarioSummary.burnRate || 0) - (baselineSummary.burnRate || 0),
      runwayMonths: (scenarioSummary.runwayMonths || 0) - (baselineSummary.runwayMonths || 0),
      arr: (scenarioSummary.arr || 0) - (baselineSummary.arr || 0),
      mrr: (scenarioSummary.mrr || 0) - (baselineSummary.mrr || 0),
    };

    return {
      scenario: scenarioSummary,
      baseline: baselineSummary,
      delta,
    };
  },

  /**
   * Get all scenarios for a model
   */
  getScenarios: async (
    userId: string,
    orgId: string,
    modelId: string
  ): Promise<any[]> => {
    // Verify model access
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: { orgId: true },
    });

    if (!model) {
      throw new NotFoundError('Model not found');
    }

    if (model.orgId !== orgId) {
      throw new ForbiddenError('Model does not belong to this organization');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this model');
    }

    // Get all scenario runs
    const scenarios = await prisma.modelRun.findMany({
      where: {
        modelId,
        orgId,
        runType: 'scenario',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        paramsJson: true,
        status: true,
        summaryJson: true,
        createdAt: true,
        finishedAt: true,
      },
    });

    // Get base model info
    const baseModel = await prisma.model.findUnique({
      where: { id: modelId },
      select: { id: true, name: true },
    });

    return scenarios.map((s) => {
      const paramsJson = s.paramsJson as any;
      const overrides = paramsJson?.overrides || {};

      // Extract changes in the expected format
      const changes = {
        revenueAdjustments: overrides.revenue?.growth ? [overrides.revenue.growth] : [],
        expenseAdjustments: overrides.costs?.growth ? [overrides.costs.growth] : [],
        hiringPlan: overrides.hiringPlan || [],
        customOverrides: {
          ...overrides,
          revenue: overrides.revenue,
          costs: overrides.costs,
          cash: overrides.cash,
        },
      };

      // Return in format expected by frontend
      return {
        id: s.id,
        scenarioName: paramsJson?.scenarioName || 'Unnamed Scenario',
        scenarioType: paramsJson?.scenarioType || 'adhoc',
        name: paramsJson?.scenarioName || 'Unnamed Scenario', // Keep for backward compatibility
        createdAt: s.createdAt.toISOString(),
        baseModelId: modelId,
        changes,
        overrides, // Also include raw overrides
        status: s.status,
        summary: s.summaryJson,
        finishedAt: s.finishedAt?.toISOString() || null,
      };
    });
  },

  /**
   * Update scenario metadata and overrides
   */
  updateScenario: async (
    userId: string,
    orgId: string,
    runId: string,
    updates: {
      name?: string;
      description?: string;
      overrides?: Record<string, any>;
    }
  ): Promise<{
    id: string;
    name: string;
    createdAt: string;
    baseModelId: string;
    changes: {
      revenueAdjustments: number[];
      expenseAdjustments: number[];
      hiringPlan: any[];
      customOverrides: object;
    };
  }> => {
    // Get scenario run
    const scenarioRun = await prisma.modelRun.findUnique({
      where: { id: runId },
      include: {
        model: {
          select: { orgId: true, id: true },
        },
      },
    });

    if (!scenarioRun) {
      throw new NotFoundError('Scenario not found');
    }

    if (scenarioRun.orgId !== orgId) {
      throw new ForbiddenError('Scenario does not belong to this organization');
    }

    if (scenarioRun.runType !== 'scenario') {
      throw new ValidationError('This is not a scenario run');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can update scenarios');
    }

    // Update paramsJson with new values
    const currentParams = (scenarioRun.paramsJson as any) || {};
    const updatedParams = {
      ...currentParams,
      ...(updates.name && { scenarioName: updates.name }),
      ...(updates.description && { description: updates.description }),
      ...(updates.overrides && { overrides: { ...currentParams.overrides, ...updates.overrides } }),
      updatedAt: new Date().toISOString(),
    };

    // Update the scenario run
    const updated = await prisma.modelRun.update({
      where: { id: runId },
      data: {
        paramsJson: updatedParams,
      },
      select: {
        id: true,
        paramsJson: true,
        modelId: true,
        createdAt: true,
      },
    });

    const paramsJson = updated.paramsJson as any;
    const overrides = paramsJson?.overrides || {};

    const changes = {
      revenueAdjustments: overrides.revenue?.growth ? [overrides.revenue.growth] : [],
      expenseAdjustments: overrides.costs?.growth ? [overrides.costs.growth] : [],
      hiringPlan: overrides.hiringPlan || [],
      customOverrides: {
        ...overrides,
        revenue: overrides.revenue,
        costs: overrides.costs,
        cash: overrides.cash,
      },
    };

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'scenario_updated',
      objectType: 'model_run',
      objectId: runId,
      metaJson: {
        updates,
        modelId: updated.modelId,
      },
    });

    return {
      id: updated.id,
      name: paramsJson?.scenarioName || 'Unnamed Scenario',
      createdAt: updated.createdAt.toISOString(),
      baseModelId: updated.modelId,
      changes,
    };
  },

  /**
   * Delete a scenario
   */
  deleteScenario: async (
    userId: string,
    orgId: string,
    runId: string
  ): Promise<void> => {
    // Get scenario run
    const scenarioRun = await prisma.modelRun.findUnique({
      where: { id: runId },
      select: { orgId: true, runType: true, status: true },
    });

    if (!scenarioRun) {
      throw new NotFoundError('Scenario not found');
    }

    if (scenarioRun.orgId !== orgId) {
      throw new ForbiddenError('Scenario does not belong to this organization');
    }

    if (scenarioRun.runType !== 'scenario') {
      throw new ValidationError('This is not a scenario run');
    }

    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can delete scenarios');
    }

    // Only allow deletion if scenario is not running
    if (scenarioRun.status === 'running') {
      throw new ValidationError('Cannot delete a scenario that is currently running');
    }

    // Delete the scenario run (cascade will handle related records)
    await prisma.modelRun.delete({
      where: { id: runId },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'scenario_deleted',
      objectType: 'model_run',
      objectId: runId,
      metaJson: {
        status: scenarioRun.status,
      },
    });
  },

  /**
   * Promote a scenario to the base model
   * This updates the base model's assumptions with the scenario's overrides
   */
  promoteScenario: async (
    userId: string,
    orgId: string,
    runId: string
  ): Promise<{ success: boolean; newVersion: number }> => {
    // 1. Fetch scenario and model
    const scenarioRun = await prisma.modelRun.findUnique({
      where: { id: runId },
      include: {
        model: true,
      },
    });

    if (!scenarioRun || scenarioRun.runType !== 'scenario') {
      throw new NotFoundError('Scenario run not found');
    }

    if (scenarioRun.orgId !== orgId) {
      throw new ForbiddenError('Scenario does not belong to this organization');
    }

    // 2. Auth check
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can promote scenarios');
    }

    const model = scenarioRun.model;
    const modelJson = model.modelJson as any;
    const scenarioParams = scenarioRun.paramsJson as any;
    const overrides = scenarioParams?.overrides || {};

    if (Object.keys(overrides).length === 0) {
      throw new ValidationError('Scenario has no overrides to promote');
    }

    // 3. Merge overrides into baseline assumptions
    const oldAssumptions = { ...modelJson.assumptions };
    const newAssumptions = {
      ...oldAssumptions,
      ...overrides,
    };

    const updatedModelJson = {
      ...modelJson,
      assumptions: newAssumptions,
      lastPromotedFrom: runId,
      updatedAtAt: new Date().toISOString(),
    };

    // 4. Update Model (Atomic Transaction)
    const newVersion = model.version + 1;
    await prisma.$transaction([
      prisma.model.update({
        where: { id: model.id },
        data: {
          modelJson: updatedModelJson,
          version: newVersion,
        },
      }),
      // Log sophisticated audit entry with diff
      prisma.auditLog.create({
        data: {
          actorUserId: userId,
          orgId,
          action: 'scenario_promoted',
          objectType: 'model',
          objectId: model.id,
          metaJson: {
            scenarioId: runId,
            scenarioName: scenarioParams?.scenarioName,
            oldVersion: model.version,
            newVersion,
            diff: {
              before: oldAssumptions,
              after: newAssumptions,
            }
          }
        }
      })
    ]);

    // 5. Trigger a new baseline run to reflect the promoted changes
    await jobService.createJob({
      jobType: 'model_run',
      orgId,
      objectId: model.id,
      createdByUserId: userId,
      params: {
        modelId: model.id,
        runType: 'baseline',
        reason: `Promoted from scenario ${scenarioParams?.scenarioName || runId}`
      }
    });

    return { success: true, newVersion };
  },
};
