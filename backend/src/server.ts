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
