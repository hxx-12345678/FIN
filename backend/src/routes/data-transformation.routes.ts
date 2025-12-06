import { Router } from 'express';
import { dataTransformationController } from '../controllers/data-transformation.controller';
import { authenticate } from '../middlewares/auth';
import { requireFinanceOrAdmin } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();
router.post('/orgs/:orgId/data/transform', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(10), dataTransformationController.transformData);
router.get('/data/transformation-templates', authenticate, dataTransformationController.getTemplates);
export default router;

