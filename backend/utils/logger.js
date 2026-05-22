/**
 * Unified Logger Utility for CityFix Backend.
 * Decouples the application code from specific logging libraries (like Winston or Pino).
 * In the future, this utility can be extended to log to files, external monitoring services, 
 * or cloud transporters (Datadog, AWS CloudWatch, Loggly) without changing controllers or middlewares.
 */

const RESET = '\x1b[0m';
const COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
};

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level, message, meta) => {
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `${COLORS[level] || RESET}[${getTimestamp()}] [${level}]${RESET}: ${message}${metaStr}`;
};

export const logger = {
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  },
  info: (message, meta) => {
    console.info(formatMessage('INFO', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage('WARN', message, meta));
  },
  error: (message, error) => {
    // If the error object is passed, extract message and stack trace
    const meta = error instanceof Error 
      ? { message: error.message, stack: error.stack } 
      : error;
    console.error(formatMessage('ERROR', message, meta));
  }
};

export default logger;
