import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import registerComplaintHandlers from './complaint.socket.js';

let io = null;

/**
 * Initialize Socket.IO Server and attach to HTTP Server.
 * 
 * @param {HttpServer} httpServer - Node.js HTTP Server instance
 * @returns {Server} Configured Socket.IO Server instance
 */
export const initIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  logger.info('Realtime Socket.IO engine successfully initialized.');

  io.on('connection', (socket) => {
    logger.debug(`Socket client connected successfully: ID = ${socket.id}`);

    // Join user-specific notification stream (citizens receive alert updates here)
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      logger.info(`Client Socket [${socket.id}] joined user notification room: [user_${userId}]`);
    });

    // Register modular feature socket listeners
    registerComplaintHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.debug(`Socket client disconnected: ID = ${socket.id}`);
    });
  });

  return io;
};

/**
 * Fetch the active Socket.IO Server singleton instance.
 * Enables controllers and services to emit real-time events out of the HTTP request cycle.
 * 
 * @returns {Server|null} Socket.IO Server instance
 */
export const getIO = () => {
  return io;
};

export default { initIO, getIO };
