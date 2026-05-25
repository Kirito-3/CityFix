import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Load environment variables from .env file
dotenv.config();

import v1Router from './routes/v1/index.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import ApiError from './utils/ApiError.js';
import ApiResponse from './utils/ApiResponse.js';

// Initialize Express App
export const app = express();

// ---------------------------------------------------------
// Global Middleware Stack Configuration
// ---------------------------------------------------------

// 1. HTTP Security Headers (Helmet protects against common web vulnerabilities)
app.use(helmet());

// 2. Cross-Origin Resource Sharing
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} is not allowed.`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// 3. HTTP Request Logging (Morgan format matches dev/prod environment styles)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 4. Request Payload Parsing Limits (Defends against massive payload denial attempts)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. API Rate Limiting (Applied globally across all API sub-routes)
app.use('/api', apiLimiter);

// ---------------------------------------------------------
// Routing Configurations
// ---------------------------------------------------------

// Favicon bypass to avoid noisy 404 browser logs
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Base Welcome Route
app.get('/', (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        platform: 'CityFix Core Services REST API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      'Welcome to the CityFix Civic Issue Reporting System Backend Services.'
    )
  );
});

// Mount Consolidated API v1 Router
app.use('/api/v1', v1Router);

// ---------------------------------------------------------
// Error Handling Pipeline
// ---------------------------------------------------------

// Catch-all route handler for undefined resources (404 Not Found)
app.use('*', (req, res, next) => {
  next(new ApiError(404, `Cannot find the requested endpoint: ${req.originalUrl}`));
});

// Centralized global error processing middleware
app.use(errorHandler);

export default app;
