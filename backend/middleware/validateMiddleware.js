import ApiError from '../utils/ApiError.js';

/**
 * Generic Zod Request Validation Middleware.
 * Validates req.body, req.query, or req.params against a defined Zod schema.
 * Rejects with a formatted ApiError containing specific field failure details on error.
 *
 * @param {ZodSchema} schema - Zod compilation layout
 * @param {string} source - Target property of req object to validate ('body', 'query', 'params')
 * @returns {Function} Express routing middleware
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      // Parse validation target properties
      const parsedData = await schema.parseAsync(req[source]);
      
      // Bind successfully parsed and sanitized variables back onto the request object
      req[source] = parsedData;
      
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        // Compile Zod error lists into a clean, readable array
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const errorMessage = `Request validation failed: ${formattedErrors.map(e => e.message).join(', ')}`;
        return next(new ApiError(400, errorMessage, formattedErrors));
      }
      next(error);
    }
  };
};

export default validate;
