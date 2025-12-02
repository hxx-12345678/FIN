/**
 * Compliance Controller
 * API endpoints for compliance and security management
 */

import { Response, NextFunction } from 'express';
import { complianceService } from '../services/compliance.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

export const complianceController = {
  /**
   * GET /api/v1/orgs/:orgId/compliance/frameworks - Get compliance frameworks
   */
  getFrameworks: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const frameworks = await complianceService.getFrameworks(orgId, req.user.id);

      res.json({
        ok: true,
        data: frameworks,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/compliance/frameworks/:frameworkType - Update framework
   */
  updateFramework: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, frameworkType } = req.params;
      const frameworks = await complianceService.updateFramework(orgId, req.user.id, frameworkType, req.body);

      res.json({
        ok: true,
        data: frameworks,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/compliance/controls - Get security controls
   */
  getSecurityControls: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const controls = await complianceService.getSecurityControls(orgId, req.user.id);

      res.json({
        ok: true,
        data: controls,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/compliance/controls/:controlId - Update security control
   */
  updateSecurityControl: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, controlId } = req.params;
      const controls = await complianceService.updateSecurityControl(orgId, req.user.id, controlId, req.body);

      res.json({
        ok: true,
        data: controls,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/compliance/audit-logs - Get audit logs
   */
  getAuditLogs: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { limit, offset, action, objectType, startDate, endDate } = req.query;

      const result = await complianceService.getAuditLogs(orgId, req.user.id, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        action: action as string,
        objectType: objectType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        ok: true,
        data: result.logs,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/compliance/policies - Get compliance policies
   */
  getPolicies: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const policies = await complianceService.getPolicies(orgId, req.user.id);

      res.json({
        ok: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/orgs/:orgId/compliance/policies/:policyId - Update policy
   */
  updatePolicy: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId, policyId } = req.params;
      const policies = await complianceService.updatePolicy(orgId, req.user.id, policyId, req.body);

      res.json({
        ok: true,
        data: policies,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/compliance/security-score - Get security score
   */
  getSecurityScore: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const score = await complianceService.getSecurityScore(orgId, req.user.id);

      res.json({
        ok: true,
        data: score,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/compliance/export - Export compliance report
   */
  exportComplianceReport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const report = await complianceService.exportComplianceReport(orgId, req.user.id);

      res.json({
        ok: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  },
};

