import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

/**
 * API Security Rate Limiter configuration.
 * Safeguards endpoint execution against Denial of Service (DoS) and automated brute force bots.
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // default to 15 mins
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next) => {
    next(
      new ApiError(
        429,
        'Too many requests from this IP. Please try again after 15 minutes.'
      )
    );
  },
});

export default apiLimiter;
