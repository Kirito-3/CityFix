import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Access Route Shielding Middleware.
 * Decodes incoming JWT Bearer tokens from authorization request headers.
 * Attaches the database User record instance to the current Express request object (req.user).
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract Bearer token from authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Access denied: Authentication token required.');
  }

  try {
    // Decode and verify jwt sign integrity
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Query User model to make sure user still exists
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      throw new ApiError(
        401,
        'Authentication failed: The user account belonging to this token no longer exists.'
      );
    }

    // Bind current authenticated user to request stream
    req.user = currentUser;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    throw new ApiError(401, 'Authentication failed: Invalid or corrupt token.');
  }
});

/**
 * Role-Based Access Control Restrictor.
 * Verifies if the authenticated requester's role exists within the authorized roles array.
 * 
 * @param  {...string} roles - Array containing allowed roles (e.g. 'citizen', 'admin', 'authority')
 * @returns {Function} Express routing middleware
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new ApiError(500, 'Security context missing user reference. Run protect middleware first.')
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: Your role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
};

export default { protect, restrictTo };
