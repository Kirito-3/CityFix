import logger from '../utils/logger.js';

/**
 * Register socket event handlers related to complaint lifecycle events.
 * 
 * @param {Server} io - Socket.IO Server instance
 * @param {Socket} socket - Connecting client Socket instance
 */
export const registerComplaintHandlers = (io, socket) => {
  // Client joins a specific complaint room to receive status/authority updates
  socket.on('join_complaint_room', (complaintId) => {
    socket.join(`complaint_${complaintId}`);
    logger.info(`Client Socket [${socket.id}] joined timeline room: [complaint_${complaintId}]`);
  });

  // Client leaves the specific complaint room
  socket.on('leave_complaint_room', (complaintId) => {
    socket.leave(`complaint_${complaintId}`);
    logger.info(`Client Socket [${socket.id}] left timeline room: [complaint_${complaintId}]`);
  });

  // Admin/Authority client joins global broadcast dashboard room for new complaint notification popups
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    logger.info(`Admin/Authority Client Socket [${socket.id}] joined global room: [admin_room]`);
  });
};

export default registerComplaintHandlers;
