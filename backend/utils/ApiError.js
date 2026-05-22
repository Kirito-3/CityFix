/**
 * Standardized API Error structure.
 * Inherits from the native JavaScript Error class.
 * Used to pass cleanly structured error metadata (HTTP status code, validation issues list, stack traces)
 * through the Express pipeline into the global error handler middleware.
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code matching semantic specification
   * @param {string} message - Descriptive error message
   * @param {Array} errors - Optional array containing precise model/validation validation details
   * @param {string} stack - Optional custom stack trace override
   */
  constructor(
    statusCode,
    message = 'An unexpected server error occurred',
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
