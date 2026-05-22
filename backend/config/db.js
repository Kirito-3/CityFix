import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Establish connection to MongoDB Atlas or local database instance.
 */
export const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    logger.info('Initializing MongoDB connection...');
    const conn = await mongoose.connect(connStr);

    logger.info(`MongoDB Connected successfully to host: ${conn.connection.host}`);
    
    // Wire up runtime connection state event listeners
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error occurred:', err);
    });

  } catch (error) {
    logger.error('Failed to establish initial MongoDB connection:', error);
    // Graceful process exit on initial database boot failure
    process.exit(1);
  }
};

export default connectDB;
