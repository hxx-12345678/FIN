import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { jobAdminController } from '../controllers/jobAdmin.controller';
import { authenticate } from '../middlewares/auth';
import { idempotencyMiddleware } from '../middlewares/idempotency';
import { quotaMiddleware } from '../middlewares/quota';

const router = Router();

// Create job (with idempotency and quota checks)
router.post(
  '/',
  authenticate,
  idempotencyMiddleware,
  quotaMiddleware,
  jobController.createJob
);

// List jobs (must come before /:id routes)
router.get('/', authenticate, jobController.listJobs);

// Get job status (alias for compatibility - must come before /:id)
router.get('/:id/status', authenticate, jobController.getJobStatus);

// Get job logs (must come before /:id)
router.get('/:id/logs', authenticate, jobController.getJobLogs);

// Get job results (must come before /:id)
router.get('/:id/results', authenticate, jobController.getJobResults);

// Cancel job (must come before /:id)
router.post('/:id/cancel', authenticate, jobController.cancelJob);

// Get job status (generic route - must come last)
router.get('/:id', authenticate, jobController.getJobStatus);

// Admin endpoints
router.get('/admin/jobs', authenticate, jobAdminController.listJobs);
router.post('/admin/jobs/:id/requeue', authenticate, jobAdminController.requeueJob);
router.post('/admin/jobs/:id/force_fail', authenticate, jobAdminController.forceFail);
router.post('/admin/jobs/:id/set_max_attempts', authenticate, jobAdminController.setMaxAttempts);
router.post('/admin/jobs/:id/release', authenticate, jobAdminController.releaseJob);

export default router;

