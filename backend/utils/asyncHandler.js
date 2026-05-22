/**
 * Wraps an asynchronous Express request handler function to automatically catch errors 
 * and pass them to the global error-handling middleware.
 * Eliminates repeating try-catch blocks in controller endpoints.
 * 
 * @param {Function} requestHandler - Asynchronous Express route handler function
 * @returns {Function} Express middleware compliant routing handler
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;
