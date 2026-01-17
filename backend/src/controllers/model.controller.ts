import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { jobService } from '../services/job.service';
import { financialModelService } from '../services/financial-model.service';
import { auditService } from '../services/audit.service';

export const modelController = {
  createModel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { org_id } = req.params;
      
      // Use new financial model service for enhanced creation
      const result = await financialModelService.createModel(
        req.user.id,
        org_id,
        req.body
      );

      res.status(201).json({
        ok: true,
        model: result.model,
        jobId: result.jobId, // Auto-model job ID if data source is not blank
      });
    } catch (error) {
      next(error);
    }
  },

  getModels: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { org_id } = req.params;

      // Verify user has access to org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: org_id,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this organization');
      }

      const models = await prisma.model.findMany({
        where: { orgId: org_id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          version: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({
        ok: true,
        models,
      });
    } catch (error) {
      next(error);
    }
  },

  getModel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;

      const model = await prisma.model.findUnique({
        where: { id: model_id },
        select: {
          id: true,
          name: true,
          version: true,
          modelJson: true,
          orgId: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify user has access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: model.orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this model');
      }

      res.json({
        ok: true,
        model,
      });
    } catch (error) {
      next(error);
    }
  },

  updateModel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;
      const { assumptions, name } = req.body || {};

      // Allow updating either assumptions or name (or both)
      if (!assumptions && !name) {
        throw new ValidationError('Either assumptions or name must be provided');
      }

      if (assumptions && typeof assumptions !== 'object') {
        throw new ValidationError('assumptions must be an object');
      }

      if (name && typeof name !== 'string') {
        throw new ValidationError('name must be a string');
      }

      if (name && name.trim().length === 0) {
        throw new ValidationError('name cannot be empty');
      }

      const model = await prisma.model.findUnique({
        where: { id: model_id },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify access (finance/admin)
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: model.orgId,
          },
        },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ForbiddenError('Only admins and finance users can update models');
      }

      const existingModelJson: any = model.modelJson || {};
      const existingAssumptions: any = (existingModelJson && typeof existingModelJson === 'object')
        ? (existingModelJson.assumptions || {})
        : {};

      // Shallow merge + nested merge for common sections
      const mergedAssumptions: any = {
        ...existingAssumptions,
        ...assumptions,
      };
      for (const section of ['revenue', 'costs', 'cash']) {
        if (
          existingAssumptions?.[section] &&
          typeof existingAssumptions[section] === 'object' &&
          assumptions?.[section] &&
          typeof assumptions[section] === 'object'
        ) {
          mergedAssumptions[section] = {
            ...existingAssumptions[section],
            ...assumptions[section],
          };
        }
      }

      // Build update data
      const updateData: any = {
        version: { increment: 1 },
      };

      // Update name if provided
      if (name) {
        updateData.name = name.trim();
      }

      // Update assumptions if provided
      if (assumptions) {
        const updatedModelJson = {
          ...(existingModelJson && typeof existingModelJson === 'object' ? existingModelJson : {}),
          assumptions: mergedAssumptions,
        };
        updateData.modelJson = updatedModelJson;
      }

      const updated = await prisma.model.update({
        where: { id: model_id },
        data: updateData,
        select: {
          id: true,
          name: true,
          version: true,
          modelJson: true,
          orgId: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const updatedFields: string[] = [];
      if (name) updatedFields.push('name');
      if (assumptions) updatedFields.push('assumptions');

      await auditService.log({
        actorUserId: req.user.id,
        orgId: model.orgId,
        action: 'model_updated',
        objectType: 'model',
        objectId: model.id,
        metaJson: { updatedFields },
      });

      res.json({ ok: true, model: updated });
    } catch (error) {
      next(error);
    }
  },

  getModelRuns: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;

      const model = await prisma.model.findUnique({
        where: { id: model_id },
        select: { orgId: true },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify user has access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: model.orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this model');
      }

      const runs = await prisma.modelRun.findMany({
        where: { modelId: model_id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          modelId: true,
          runType: true,
          status: true,
          summaryJson: true,
          paramsJson: true,
          createdAt: true,
          finishedAt: true,
        },
      });

      res.json({
        ok: true,
        runs,
      });
    } catch (error) {
      next(error);
    }
  },

  createModelRun: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;
      const { runType, paramsJson, params } = req.body;

      // Support both paramsJson and params (for backward compatibility)
      const finalParamsJson = paramsJson || params || {};

      // Validate runType
      const validRunTypes = ['baseline', 'scenario', 'adhoc', 'forecast'];
      const finalRunType = runType || 'baseline';
      if (!validRunTypes.includes(finalRunType)) {
        throw new ValidationError(`runType must be one of: ${validRunTypes.join(', ')}`);
      }

      const model = await prisma.model.findUnique({ where: { id: model_id } });
      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify user has access to model's org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: model.orgId,
          },
        },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ForbiddenError('Only admins and finance users can create model runs');
      }

      // Ensure modelType is stored in paramsJson
      const enrichedParamsJson = {
        ...finalParamsJson,
        // Ensure modelType is set (support both modelType and model_type)
        modelType: finalParamsJson.modelType || finalParamsJson.model_type || 'prophet',
        model_type: finalParamsJson.modelType || finalParamsJson.model_type || 'prophet',
      };

      // Create model run
      const modelRun = await prisma.modelRun.create({
        data: {
          modelId: model_id,
          orgId: model.orgId,
          runType: finalRunType,
          paramsJson: enrichedParamsJson,
          status: 'queued',
        },
      });

      // Create job for Python worker
      const job = await jobService.createJob({
        jobType: 'model_run',
        orgId: model.orgId,
        objectId: modelRun.id,
        createdByUserId: req.user.id,
        params: {
          modelRunId: modelRun.id,
          modelId: model_id,
          runType: finalRunType,
          paramsJson: enrichedParamsJson,
        },
      });

      res.status(201).json({
        ok: true,
        modelRun: {
          id: modelRun.id,
          runType: modelRun.runType,
          status: modelRun.status,
          createdAt: modelRun.createdAt,
        },
        jobId: job.id,
      });
    } catch (error) {
      next(error);
    }
  },

  getModelRun: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id, run_id } = req.params;
      const run = await prisma.modelRun.findFirst({
        where: {
          id: run_id,
          modelId: model_id,
        },
        include: {
          model: {
            select: {
              id: true,
              name: true,
              orgId: true,
            },
          },
        },
      });

      if (!run) {
        throw new NotFoundError('Model run not found');
      }

      // Verify user has access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: run.orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this model run');
      }

      res.json({
        ok: true,
        run: {
          id: run.id,
          modelId: run.modelId,
          runType: run.runType,
          status: run.status,
          paramsJson: run.paramsJson,
          summaryJson: run.summaryJson,
          resultS3: run.resultS3,
          createdAt: run.createdAt,
          finishedAt: run.finishedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  deleteModel: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { org_id, model_id } = req.params;

      const model = await prisma.model.findUnique({
        where: { id: model_id },
        select: { orgId: true },
      });

      if (!model) {
        throw new NotFoundError('Model not found');
      }

      if (model.orgId !== org_id) {
        throw new ForbiddenError('Model does not belong to this organization');
      }

      // Verify user has access (admin or finance required for delete)
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: org_id,
          },
        },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ForbiddenError('Only admins and finance users can delete models');
      }

      // Delete model runs first (cascade)
      await prisma.modelRun.deleteMany({
        where: { modelId: model_id },
      });

      // Delete model
      await prisma.model.delete({
        where: { id: model_id },
      });

      res.json({
        ok: true,
        message: 'Model deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  // NEW: Create Snapshot
  createSnapshot: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;
      const { paramsJson } = req.body;

      const model = await prisma.model.findUnique({ where: { id: model_id } });
      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify access (finance/admin)
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: { userId: req.user.id, orgId: model.orgId },
        },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ForbiddenError('Only finance/admin can create snapshots');
      }

      // Create snapshot (scenario run)
      const modelRun = await prisma.modelRun.create({
        data: {
          modelId: model_id,
          orgId: model.orgId,
          runType: 'scenario',
          paramsJson: paramsJson || {},
          status: 'queued',
        },
      });

      // Queue job
      const job = await jobService.createJob({
        jobType: 'model_run',
        orgId: model.orgId,
        objectId: modelRun.id,
        createdByUserId: req.user.id,
        params: {
          modelRunId: modelRun.id,
          modelId: model_id,
          runType: 'scenario',
          paramsJson: paramsJson || {},
        },
      });

      res.status(201).json({
        ok: true,
        snapshotId: modelRun.id,
        jobId: job.id,
      });
    } catch (error) {
      next(error);
    }
  },

  // NEW: Get Snapshots
  getSnapshots: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const model = await prisma.model.findUnique({ where: { id: model_id } });
      if (!model) {
        throw new NotFoundError('Model not found');
      }

      // Verify access
      const role = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId: req.user.id, orgId: model.orgId } },
      });

      if (!role) {
        throw new ForbiddenError('No access to this model');
      }

      const [snapshots, total] = await Promise.all([
        prisma.modelRun.findMany({
          where: { modelId: model_id, runType: 'scenario' },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            status: true,
            createdAt: true,
            finishedAt: true,
            paramsJson: true,
            summaryJson: true,
          },
        }),
        prisma.modelRun.count({ where: { modelId: model_id, runType: 'scenario' } }),
      ]);

      res.json({
        ok: true,
        snapshots,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // NEW: Delete Snapshot
  deleteSnapshot: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id, run_id } = req.params;

      const run = await prisma.modelRun.findUnique({
        where: { id: run_id },
        include: { model: true },
      });

      if (!run || run.modelId !== model_id) {
        throw new NotFoundError('Snapshot not found');
      }

      // Cannot delete baseline (unless model is deleted)
      if (run.runType === 'baseline') {
        throw new ValidationError('Cannot delete baseline run directly');
      }

      // Verify access (finance/admin)
      const role = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId: req.user.id, orgId: run.orgId } },
      });

      if (!role || !['admin', 'finance'].includes(role.role)) {
        throw new ForbiddenError('Only finance/admin can delete snapshots');
      }

      await prisma.modelRun.delete({ where: { id: run_id } });

      res.json({ ok: true, message: 'Snapshot deleted' });
    } catch (error) {
      next(error);
    }
  },

  // NEW: Compare Runs
  compareRuns: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { model_id } = req.params;
      const { run_a, run_b } = req.query;

      if (!run_a || !run_b || typeof run_a !== 'string' || typeof run_b !== 'string') {
        throw new ValidationError('run_a and run_b params required');
      }

      // Fetch both runs
      const [runA, runB] = await Promise.all([
        prisma.modelRun.findUnique({ where: { id: run_a } }),
        prisma.modelRun.findUnique({ where: { id: run_b } }),
      ]);

      if (!runA || !runB) {
        throw new NotFoundError('One or both runs not found');
      }

      if (runA.modelId !== model_id || runB.modelId !== model_id) {
        throw new ValidationError('Runs must belong to the specified model');
      }

      // Verify access
      const role = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId: req.user.id, orgId: runA.orgId } },
      });

      if (!role) {
        throw new ForbiddenError('No access to this model');
      }

      // Basic diffing logic (can be enhanced)
      // Calculate differences in metrics from summaryJson
      const metricsA = (runA.summaryJson as any)?.metrics || {};
      const metricsB = (runB.summaryJson as any)?.metrics || {};

      const diff = {
        runA: { id: runA.id, name: (runA.paramsJson as any)?.name || runA.createdAt },
        runB: { id: runB.id, name: (runB.paramsJson as any)?.name || runB.createdAt },
        metricsDiff: {} as Record<string, any>,
      };

      // Compare common metrics
      const allKeys = new Set([...Object.keys(metricsA), ...Object.keys(metricsB)]);
      allKeys.forEach(key => {
        const valA = metricsA[key] || 0;
        const valB = metricsB[key] || 0;
        diff.metricsDiff[key] = {
          a: valA,
          b: valB,
          delta: valB - valA,
          percent: valA !== 0 ? ((valB - valA) / valA) * 100 : 0
        };
      });

      res.json({ ok: true, diff });
    } catch (error) {
      next(error);
    }
  }
};
