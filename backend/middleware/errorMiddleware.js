import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Express Global Error Handling Middleware.
 * Captures all standard runtime errors, Mongoose ODM database faults, authentication failures,
 * and custom ApiError triggers. Sanitizes stack traces in production mode.
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of our standardized ApiError, transform it.
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || 'Something went wrong on the server';
    error = new ApiError(statusCode, message, err.errors || [], err.stack);
  }

  // Handle Mongoose cast error (e.g., malformed Hex ObjectIds)
  if (error instanceof mongoose.Error.CastError) {
    error = new ApiError(400, `Resource not found: Invalid field format for '${error.path}'`);
  }

  // Handle Mongoose index duplication error (e.g. duplicate email registrations)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value error: A record with that '${field}' already exists.`;
    error = new ApiError(400, message);
  }

  // Handle JWT verification failures
  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Unauthorized access: Signature verification failed.');
  }

  // Handle JWT expired timeouts
  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Unauthorized access: Login session has expired.');
  }

  // Extract variables for HTTP response package
  const { statusCode, message, errors, success } = error;

  // Detailed server logging
  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, error);

  res.status(statusCode).json({
    success,
    statusCode,
    message,
    errors: errors.length > 0 ? errors : undefined,
    // Safeguard system internals by withholding stack traces in non-dev environment stages
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

export default errorHandler;
