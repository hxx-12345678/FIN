import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import prisma from './config/database';

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Start listening
    const port = config.port;
    app.listen(port, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Health check: http://localhost:${port}/health`);
      logger.info(`🔧 Environment: ${config.nodeEnv}`);
      
      // Keep Python Worker awake on Render Free Tier
      const workerUrl = process.env.PYTHON_WORKER_URL || 'https://fin-1-qn1p.onrender.com';
      logger.info(`⏰ Starting keep-alive ping for Python Worker at: ${workerUrl}`);
      setInterval(async () => {
        try {
          // Pinging the health endpoint. Even if it returns 403 (missing secret), 
          // the HTTP request prevents the Render instance from going to sleep.
          await fetch(`${workerUrl}/health`, { method: 'GET' });
          logger.debug('Pinged Python Worker to keep it awake.');
        } catch (err) {
          logger.warn(`Failed to ping Python worker: ${err}`);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdowns
process.on('SIGINT', async () => {
  logger.info('\n🛑 Shutting down gracefully (SIGINT)...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n🛑 Shutting down gracefully (SIGTERM)...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();
