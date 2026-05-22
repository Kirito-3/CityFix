import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initIO } from './sockets/index.js';
import logger from './utils/logger.js';

// Setup Uncaught Exception global listeners (fail-safe for critical thread exceptions)
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL: Uncaught Exception caught, shutting down server...', err);
  process.exit(1);
});

/**
 * Boots the CityFix Backend Server engine.
 * Connects to MongoDB first, launches HTTP listeners, and attaches the Socket.IO broker.
 */
const startServer = async () => {
  try {
    // 1. Establish connection to MongoDB Database
    await connectDB();

    // 2. Initialize Node.js HTTP Server wrapping Express app context
    const server = http.createServer(app);

    // 3. Initialize and attach Socket.IO server engine
    initIO(server);

    // 4. Retrieve network configuration values
    const PORT = process.env.PORT || 5000;
    const ENV = process.env.NODE_ENV || 'development';

    // 5. Spin up active network listeners
    const activeServer = server.listen(PORT, () => {
      logger.info(`===========================================================`);
      logger.info(` CITYFIX BACKEND CORE ONLINE AND LISTEN ON PORT: ${PORT}`);
      logger.info(` Environment Mode: ${ENV.toUpperCase()}`);
      logger.info(` API Welcome Landing page: http://localhost:${PORT}/`);
      logger.info(` API Healthcheck channel: http://localhost:${PORT}/api/v1/health`);
      logger.info(`===========================================================`);
    });

    // Setup Unhandled Promise Rejection listeners (failsafe for unhandled async DB faults)
    process.on('unhandledRejection', (err) => {
      logger.error('CRITICAL: Unhandled Promise Rejection caught! Shutting down server gracefully...', err);
      activeServer.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error('Failed to launch application server:', error);
    process.exit(1);
  }
};

// Initiate server launch
startServer();
