import express from 'express';
import { registerUser, loginUser, getMe } from '../../controllers/authController.js';
import { validate } from '../../middleware/validateMiddleware.js';
import { signupSchema, loginSchema } from '../../validators/authValidator.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Mount registration and login routes with zod-validation gates
router.post('/signup', validate(signupSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

// Mount profile route protected by JWT verification
router.get('/me', protect, getMe);

export default router;
