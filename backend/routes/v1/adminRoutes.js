import express from 'express';
import { getDashboardStats, assignComplaintAuthority } from '../../controllers/adminController.js';
import { protect, restrictTo } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All administrative endpoints require authentication and restrict privileges strictly to admin roles
router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', getDashboardStats);
router.patch('/complaints/:id/assign', assignComplaintAuthority);

export default router;
