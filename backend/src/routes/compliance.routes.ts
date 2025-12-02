/**
 * Compliance Routes
 * Routes for compliance and security management
 */

import { Router } from 'express';
import { complianceController } from '../controllers/compliance.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Compliance frameworks
router.get('/orgs/:orgId/compliance/frameworks', authenticate, requireOrgAccess('orgId'), complianceController.getFrameworks);
router.put('/orgs/:orgId/compliance/frameworks/:frameworkType', authenticate, requireOrgAccess('orgId'), complianceController.updateFramework);

// Security controls
router.get('/orgs/:orgId/compliance/controls', authenticate, requireOrgAccess('orgId'), complianceController.getSecurityControls);
router.put('/orgs/:orgId/compliance/controls/:controlId', authenticate, requireOrgAccess('orgId'), complianceController.updateSecurityControl);

// Audit logs
router.get('/orgs/:orgId/compliance/audit-logs', authenticate, requireOrgAccess('orgId'), complianceController.getAuditLogs);

// Policies
router.get('/orgs/:orgId/compliance/policies', authenticate, requireOrgAccess('orgId'), complianceController.getPolicies);
router.put('/orgs/:orgId/compliance/policies/:policyId', authenticate, requireOrgAccess('orgId'), complianceController.updatePolicy);

// Security score
router.get('/orgs/:orgId/compliance/security-score', authenticate, requireOrgAccess('orgId'), complianceController.getSecurityScore);

// Export
router.get('/orgs/:orgId/compliance/export', authenticate, requireOrgAccess('orgId'), complianceController.exportComplianceReport);

export default router;

