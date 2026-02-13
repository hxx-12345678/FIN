import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import prisma from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import orgRoutes from './routes/org.routes';
import connectorRoutes from './routes/connector.routes';
import csvRoutes from './routes/csv.routes';
import excelRoutes from './routes/excel.routes';
import modelRoutes from './routes/model.routes';
import monteCarloRoutes from './routes/montecarlo.routes';
import provenanceRoutes from './routes/provenance.routes';
import exportRoutes from './routes/export.routes';
import jobRoutes from './routes/job.routes';
import debugRoutes from './routes/debug.routes';
import scenarioRoutes from './routes/scenario.routes';
import alertRoutes from './routes/alert.routes';
import aicfoRoutes from './routes/aicfo.routes';
import adminRoutes from './routes/admin.routes';
import taskRoutes from './routes/task.routes';
import settingsRoutes from './routes/settings.routes';
import riskRoutes from './routes/risk.routes';
import shareTokenRoutes from './routes/shareToken.routes';
import budgetActualRoutes from './routes/budget-actual.routes';
import scheduledAutoModelRoutes from './routes/scheduled-auto-model.routes';
import investorExportRoutes from './routes/investor-export.routes';
import investorDashboardRoutes from './routes/investor-dashboard.routes';
import realtimeSimulationRoutes from './routes/realtime-simulation.routes';
import overviewDashboardRoutes from './routes/overview-dashboard.routes';
import transactionRoutes from './routes/transaction.routes';
import boardReportingRoutes from './routes/board-reporting.routes';
import userManagementRoutes from './routes/user-management.routes';
import notificationRoutes from './routes/notification.routes';
import complianceRoutes from './routes/compliance.routes';
import aiSummariesRoutes from './routes/ai-summaries.routes';
import aiAnomalyDetectionRoutes from './routes/ai-anomaly-detection.routes';
import reportApprovalRoutes from './routes/report-approval.routes';
import formulaAutocompleteRoutes from './routes/formula-autocomplete.routes';
import slackIntegrationRoutes from './routes/slack-integration.routes';
import drillDownRoutes from './routes/drill-down.routes';
import dataTransformationRoutes from './routes/data-transformation.routes';
import dataImportRoutes from './routes/data-import.routes';
import headcountPlanningRoutes from './routes/headcount-planning.routes';
import industryTemplatesRoutes from './routes/industry-templates.routes';
import quotaRoutes from './routes/quota.routes';
import csvTemplateRoutes from './routes/csv-template.routes';
import csvMappingRoutes from './routes/csv-mapping.routes';
import onboardingRoutes from './routes/onboarding.routes';
import pricingRoutes from './routes/pricing.routes';
import usageRoutes from './routes/usage.routes';
import decisionEngineRoutes from './routes/decision-engine.routes';
import approvalRoutes from './routes/approval.routes';
import semanticLayerRoutes from './routes/semantic-layer.routes';
import computeRoutes from './routes/compute.routes';

dotenv.config();

const app = express();

// CORS Configuration - Allow frontend connection
// Support multiple origins for development and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://fin-plum.vercel.app',
  'https://finapilot-mvp.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Helper function to check if origin is allowed
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) {
    return true; // Allow requests with no origin (like mobile apps or curl requests)
  }

  // Check exact match in allowed origins
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Allow all Vercel deployments (production and preview)
  if (origin.endsWith('.vercel.app')) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Log blocked origin for debugging
      logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}, or any *.vercel.app domain`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400, // 24 hours - cache preflight requests for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Explicit OPTIONS handler for preflight requests (additional safety)
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      body: req.method !== 'GET' && Object.keys(req.body || {}).length > 0 ? req.body : undefined,
    });
    next();
  });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    // Check critical environment variables
    const envCheck = {
      database: !!config.databaseUrl,
      jwtSecret: !!config.jwtSecret,
      nodeEnv: config.nodeEnv,
    };

    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'running',
      },
      environment: envCheck,
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'running',
      },
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    ok: true,
    name: 'FinaPilot API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      orgs: '/api/v1/orgs',
      connectors: '/api/v1/connectors',
      csv: '/api/v1/orgs/:orgId/import/csv',
      models: '/api/v1/models',
      montecarlo: '/api/v1/models/:model_id/montecarlo',
      jobs: '/api/v1/jobs',
      provenance: '/api/v1/provenance',
      exports: '/api/v1/exports',
      scenarios: '/api/v1/models/:modelId/scenarios',
      alerts: '/api/v1/orgs/:orgId/alerts',
      aiPlans: '/api/v1/orgs/:orgId/ai-plans',
      admin: '/api/v1/admin',
      tasks: '/api/v1/tasks',
      settings: '/api/v1/orgs/:orgId/settings',
      risk: '/api/v1/montecarlo/:jobId/risk',
      shareTokens: '/api/v1/orgs/:orgId/share-tokens',
      budgetActual: '/api/v1/orgs/:orgId/models/:modelId/budget-actual',
      aiSummaries: '/api/v1/orgs/:orgId/ai-summaries',
      anomalyDetection: '/api/v1/orgs/:orgId/anomalies',
    },
  });
});

// API Routes
// IMPORTANT: More specific routes must be registered before less specific ones
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orgs', orgRoutes);
app.use('/api/v1', connectorRoutes);
app.use('/api/v1', csvRoutes);
app.use('/api/v1', excelRoutes);
// Monte Carlo routes must come before model routes to prevent /models/:model_id from matching /models/:model_id/montecarlo
app.use('/api/v1', monteCarloRoutes);
app.use('/api/v1', modelRoutes);
app.use('/api/v1/provenance', provenanceRoutes);
app.use('/api/v1', exportRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1', scenarioRoutes);
app.use('/api/v1', alertRoutes);
app.use('/api/v1', overviewDashboardRoutes);
app.use('/api/v1', aicfoRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', taskRoutes);
app.use('/api/v1', settingsRoutes);
app.use('/api/v1', riskRoutes);
app.use('/api/v1', shareTokenRoutes);
app.use('/api/v1', budgetActualRoutes);
app.use('/api/v1', scheduledAutoModelRoutes);
app.use('/api/v1', investorExportRoutes);
app.use('/api/v1', investorDashboardRoutes);
app.use('/api/v1', realtimeSimulationRoutes);
app.use('/api/v1', transactionRoutes);
app.use('/api/v1', boardReportingRoutes);
app.use('/api/v1', userManagementRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1', complianceRoutes);
app.use('/api/v1', aiSummariesRoutes);
app.use('/api/v1', aiAnomalyDetectionRoutes);
app.use('/api/v1', reportApprovalRoutes);
app.use('/api/v1', formulaAutocompleteRoutes);
app.use('/api/v1', slackIntegrationRoutes);
app.use('/api/v1', drillDownRoutes);
app.use('/api/v1', dataTransformationRoutes);
app.use('/api/v1', dataImportRoutes);
app.use('/api/v1', headcountPlanningRoutes);
app.use('/api/v1', industryTemplatesRoutes);
app.use('/api/v1', quotaRoutes);
app.use('/api/v1', csvTemplateRoutes);
app.use('/api/v1', csvMappingRoutes);
app.use('/api/v1', onboardingRoutes);
app.use('/api/v1', pricingRoutes);
app.use('/api/v1', usageRoutes);
app.use('/api/v1', decisionEngineRoutes);
app.use('/api/v1', approvalRoutes);
app.use('/api/v1', semanticLayerRoutes);
app.use('/api/v1/compute', computeRoutes);
app.use('/api/v1/debug', debugRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.path}`,
      path: req.path,
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

