import express from 'express';
import authRoutes from './authRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import ApiResponse from '../../utils/ApiResponse.js';

const router = express.Router();

/**
 * Service Status Health Check.
 * Route: GET /api/v1/health
 * Access: Public
 */
router.get('/health', (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    status: 'UP',
    message: 'CityFix Core Services online and operational.',
    timestamp: new Date(),
  };
  res.status(200).json(new ApiResponse(200, healthData, 'Service is healthy.'));
});

// Consolidate API modules
router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

export default router;
