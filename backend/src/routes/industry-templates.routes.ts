import { Router } from 'express';
import { industryTemplatesController } from '../controllers/industry-templates.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/industry-templates', authenticate, industryTemplatesController.getTemplates);
router.get('/industry-templates/:templateId', authenticate, industryTemplatesController.getTemplateById);
router.get('/industry-templates/industry/:industry', authenticate, industryTemplatesController.getTemplateByIndustry);

export default router;

