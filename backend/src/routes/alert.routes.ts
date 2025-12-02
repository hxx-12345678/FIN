import { Router } from 'express';
import { alertController } from '../controllers/alert.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

// Create alert rule
router.post('/orgs/:orgId/alerts', authenticate, requireFinanceOrAdmin('orgId'), alertController.createAlert);

// List alert rules
router.get('/orgs/:orgId/alerts', authenticate, requireOrgAccess('orgId'), alertController.listAlerts);

// Get alert rule
router.get('/alerts/:alertId', authenticate, alertController.getAlert);

// Update alert rule
router.put('/alerts/:alertId', authenticate, alertController.updateAlert);

// Delete alert rule
router.delete('/alerts/:alertId', authenticate, alertController.deleteAlert);

// Test alert rule
router.post('/alerts/:alertId/test', authenticate, alertController.testAlert);

export default router;


