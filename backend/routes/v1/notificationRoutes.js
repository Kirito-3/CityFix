import express from 'express';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  registerFCMToken,
} from '../../controllers/notificationController.js';
import { protect } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validateMiddleware.js';
import { registerTokenSchema } from '../../validators/notificationValidator.js';

const router = express.Router();

// Require active user authentication sessions across all routes
router.use(protect);

router.get('/', getMyNotifications);
router.post('/register-token', validate(registerTokenSchema), registerFCMToken);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

export default router;
