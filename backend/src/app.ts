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

dotenv.config();

const app = express();

// CORS Configuration - Allow frontend connection
// Support multiple origins for development and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://fin-plum.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, log the blocked origin for debugging
      if (config.nodeEnv === 'development') {
        logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
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
      },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orgs', orgRoutes);
app.use('/api/v1/connectors', connectorRoutes);
app.use('/api/v1', csvRoutes);
app.use('/api/v1', excelRoutes);
app.use('/api/v1', modelRoutes);
app.use('/api/v1', monteCarloRoutes);
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

// Start server
async function startServer() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    app.listen(config.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.port}`);
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
      logger.info(`🔧 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;

