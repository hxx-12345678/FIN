import { Router } from 'express';
import { consolidationController } from '../controllers/consolidation.controller';
import { authenticate } from '../middlewares/auth';
import { requireOrgAccess, requireFinanceOrAdmin } from '../middlewares/rbac';

const router = Router();

// Entity CRUD
router.post('/orgs/:orgId/consolidation/entities', authenticate, requireFinanceOrAdmin('orgId'), consolidationController.createEntity);
router.get('/orgs/:orgId/consolidation/entities', authenticate, requireOrgAccess('orgId'), consolidationController.listEntities);
router.put('/orgs/:orgId/consolidation/entities/:entityId', authenticate, requireFinanceOrAdmin('orgId'), consolidationController.updateEntity);
router.delete('/orgs/:orgId/consolidation/entities/:entityId', authenticate, requireFinanceOrAdmin('orgId'), consolidationController.deleteEntity);

// Consolidation execution
router.post('/orgs/:orgId/consolidation/run', authenticate, requireFinanceOrAdmin('orgId'), consolidationController.runConsolidation);
router.get('/orgs/:orgId/consolidation/summary', authenticate, requireOrgAccess('orgId'), consolidationController.getSummary);

export default router;
