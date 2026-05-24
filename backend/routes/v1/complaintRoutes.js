import express from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
} from '../../controllers/complaintController.js';
import { protect, restrictTo } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validateMiddleware.js';
import { uploadArray } from '../../middleware/uploadMiddleware.js';
import {
  createComplaintSchema,
  updateComplaintStatusSchema,
} from '../../validators/complaintValidator.js';

const router = express.Router();

// All complaint endpoints require an active JWT session
router.use(protect);

router
  .route('/')
  .post(restrictTo('citizen'), uploadArray, validate(createComplaintSchema), createComplaint)
  .get(getComplaints);

router.route('/:id').get(getComplaintById);

router
  .route('/:id/status')
  .patch(restrictTo('admin', 'authority'), validate(updateComplaintStatusSchema), updateComplaintStatus);

export default router;
