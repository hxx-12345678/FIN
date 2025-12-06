import { Router } from 'express';
import { slackIntegrationController } from '../controllers/slack-integration.controller';
import { authenticate } from '../middlewares/auth';
import { requireFinanceOrAdmin } from '../middlewares/rbac';
import { rateLimit } from '../middlewares/rateLimit';

const router = Router();
router.post('/orgs/:orgId/slack/configure', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(5), slackIntegrationController.configureSlack);
router.get('/orgs/:orgId/slack/config', authenticate, requireFinanceOrAdmin('orgId'), slackIntegrationController.getSlackConfig);
router.post('/orgs/:orgId/slack/send-report', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(10), slackIntegrationController.sendReport);
router.post('/orgs/:orgId/slack/send-anomaly', authenticate, requireFinanceOrAdmin('orgId'), rateLimit(20), slackIntegrationController.sendAnomalyNotification);
export default router;

