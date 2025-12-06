/**
 * REPORT APPROVAL CONTROLLER
 * Handles HTTP requests for report approval workflows
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { reportApprovalService, CreateReportRequest, ApprovalRequest } from '../services/report-approval.service';
import { ValidationError } from '../utils/errors';
import { validateUUID } from '../utils/validation';

export const reportApprovalController = {
  /**
   * Create a report with approval workflow
   * POST /api/v1/orgs/:orgId/reports
   */
  createReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const {
        modelRunId,
        type,
        approvalRequired,
        approverIds,
        distributionList,
        distributionMethod,
        scheduledAt,
        scheduleFrequency,
        metaJson,
      } = req.body;

      // Validate orgId format
      validateUUID(orgId, 'Organization ID');

      if (!type) {
        throw new ValidationError('Report type is required');
      }

      const validTypes = ['pptx', 'pdf', 'memo', 'xlsx'];
      if (!validTypes.includes(type)) {
        throw new ValidationError(`Report type must be one of: ${validTypes.join(', ')}`);
      }

      // Validate that approverIds are provided if approval is required
      if (approvalRequired && (!approverIds || !Array.isArray(approverIds) || approverIds.length === 0)) {
        throw new ValidationError('Approver IDs are required when approval is required');
      }

      // Validate approverIds format if provided
      if (approverIds && Array.isArray(approverIds)) {
        for (const approverId of approverIds) {
          validateUUID(approverId, 'Approver ID');
        }
      }

      // Validate modelRunId format if provided
      if (modelRunId) {
        validateUUID(modelRunId, 'Model Run ID');
      }

      const request: CreateReportRequest = {
        orgId,
        modelRunId,
        type,
        approvalRequired,
        approverIds,
        distributionList,
        distributionMethod,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        scheduleFrequency,
        metaJson,
      };

      const report = await reportApprovalService.createReport(request, req.user.id);

      res.status(201).json({
        ok: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submit report for approval
   * POST /api/v1/orgs/:orgId/reports/:exportId/submit
   */
  submitForApproval: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, exportId } = req.params;
      const { approverIds } = req.body;

      // Validate UUID formats
      validateUUID(orgId, 'Organization ID');
      validateUUID(exportId, 'Export ID');

      if (!approverIds || !Array.isArray(approverIds) || approverIds.length === 0) {
        throw new ValidationError('Approver IDs are required');
      }

      // Validate each approver ID format
      for (const approverId of approverIds) {
        validateUUID(approverId, 'Approver ID');
      }

      const report = await reportApprovalService.submitForApproval(
        exportId,
        orgId,
        req.user.id,
        approverIds
      );

      res.json({
        ok: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Approve or reject a report
   * POST /api/v1/orgs/:orgId/reports/:exportId/approve
   */
  approveOrReject: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, exportId } = req.params;
      const { action, comment } = req.body;

      // Validate UUID formats
      validateUUID(orgId, 'Organization ID');
      validateUUID(exportId, 'Export ID');

      if (!action) {
        throw new ValidationError('Action is required');
      }

      const validActions = ['approve', 'reject', 'request_changes'];
      if (!validActions.includes(action)) {
        throw new ValidationError(`Action must be one of: ${validActions.join(', ')}`);
      }

      const request: ApprovalRequest = {
        exportId,
        action,
        comment,
      };

      const report = await reportApprovalService.approveOrReject(
        request,
        orgId,
        req.user.id
      );

      res.json({
        ok: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get approval status
   * GET /api/v1/orgs/:orgId/reports/:exportId/approval-status
   */
  getApprovalStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, exportId } = req.params;

      // Validate UUID formats
      validateUUID(orgId, 'Organization ID');
      validateUUID(exportId, 'Export ID');

      const status = await reportApprovalService.getApprovalStatus(
        exportId,
        orgId,
        req.user.id
      );

      res.json({
        ok: true,
        status,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Schedule a report
   * POST /api/v1/orgs/:orgId/reports/:exportId/schedule
   */
  scheduleReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, exportId } = req.params;
      const { scheduledAt, scheduleFrequency } = req.body;

      // Validate UUID formats
      validateUUID(orgId, 'Organization ID');
      validateUUID(exportId, 'Export ID');

      if (!scheduledAt) {
        throw new ValidationError('Scheduled time is required');
      }

      const report = await reportApprovalService.scheduleReport(
        exportId,
        orgId,
        req.user.id,
        new Date(scheduledAt),
        scheduleFrequency
      );

      res.json({
        ok: true,
        report,
      });
    } catch (error) {
      next(error);
    }
  },
};

