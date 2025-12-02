import { Router } from 'express';
import { boardReportingController } from '../controllers/board-reporting.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess } from '../middlewares/rbac';

const router = Router();

// Generate board report
router.post(
  '/orgs/:orgId/board-reports',
  authenticate,
  requireOrgAccess('orgId'),
  boardReportingController.generateBoardReport
);

// Get available templates
router.get(
  '/orgs/:orgId/board-reports/templates',
  authenticate,
  requireOrgAccess('orgId'),
  boardReportingController.getTemplates
);

// Get available metrics
router.get(
  '/orgs/:orgId/board-reports/metrics',
  authenticate,
  requireOrgAccess('orgId'),
  boardReportingController.getMetrics
);

// List schedules
router.get(
  '/orgs/:orgId/board-reports/schedules',
  authenticate,
  requireOrgAccess('orgId'),
  boardReportingController.listSchedules
);

// Create schedule
router.post(
  '/orgs/:orgId/board-reports/schedules',
  authenticate,
  requireOrgAccess('orgId'),
  boardReportingController.createSchedule
);

// Cancel schedule
router.delete(
  '/orgs/:orgId/board-reports/schedules/:scheduleId',
  authenticate,
  requireOrgAccess('orgId'),
  boardReportingController.deleteSchedule
);

export default router;

