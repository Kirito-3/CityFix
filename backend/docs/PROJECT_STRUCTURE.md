# CityFix Backend Project Structure Documentation

This document describes the design patterns, architectural decisions, and directory layout implemented in the CityFix Node.js + Express backend.

---

## 1. Directory Tree Architecture

The workspace is organized into modular directories to maintain strict Separation of Concerns (SoC) and facilitate easy scaling as new modules (e.g. civic department management, user reward programs) are added.

```
backend/
├── config/                  # Database connections & third-party config initializers
│   ├── db.js                # Mongoose connection & lifecycle event broker
│   └── cloudinary.js        # Media storage configurations (Placeholder)
├── controllers/             # Request controllers (translates requests into service calls)
│   ├── adminController.js   # Administrative statistics & department assignment
│   ├── authController.js    # User registrations, logins, and profile fetches
│   ├── complaintController.js# Complaint CRUD operations & spatial search queries
│   └── notificationController.js # Alerts and notifications CRUD
├── docs/                    # Central repository for backend system documentation
│   ├── API_STRUCTURE.md     # Express routes and parameters documentation
│   ├── BACKEND_SETUP.md     # Installation, setup, testing, and deployment
│   ├── DEVELOPMENT_PROGRESS.md # Continuous development checklist
│   └── PROJECT_STRUCTURE.md # This architecture file
├── middleware/              # Global and route-specific Express middlewares
│   ├── authMiddleware.js    # JWT authorization and RBAC restriction gates
│   ├── errorMiddleware.js   # Centralized error handler sanitizing stacks
│   ├── rateLimiter.js       # IP-based rate limiting safeguarding endpoints
│   └── validateMiddleware.js# Dynamic Zod validation middleware
├── models/                  # Mongoose data modeling & ODM schemas
│   ├── Complaint.js         # GeoJSON-indexed complaint data schemas
│   ├── Notification.js      # Alert schema mapping recipient user refs
│   ├── StatusLog.js         # Decoupled timeline tracking logs audit history
│   └── User.js              # Password-hashed credential schema
├── routes/                  # Express route registries
│   └── v1/                  # API v1 versioning layer
│       ├── adminRoutes.js   # Protected endpoints for administrator dashboard
│       ├── authRoutes.js    # Session access endpoints (Public + Private)
│       ├── complaintRoutes.js # Core complaints management routing
│       ├── index.js         # API v1 entry router & health indicator
│       └── notificationRoutes.js # In-app notification alert updates routing
├── services/                # Standalone systems services (e.g., FCM push, SMS)
├── sockets/                 # WebSockets realtime communications
│   ├── complaint.socket.js  # Complaint channel subscriptions
│   └── index.js             # Bootstrapping singleton Socket.IO instance
├── uploads/                 # Multipurpose folder for local Multer cache storage
├── utils/                   # Shared auxiliary helpers
│   ├── ApiError.js          # Custom semantic Error wrapper class
│   ├── ApiResponse.js       # Successful HTTP package response wrap
│   ├── asyncHandler.js      # Unhandled promise error catcher wrapper
│   └── logger.js            # Unified logger replacing raw consoles
├── validators/              # Runtime payload verification validators
│   ├── authValidator.js     # Zod payload layouts for signups & logins
│   └── complaintValidator.js# Zod payload layouts for reports & status changes
├── .env.example             # Standard environmental blueprint configurations
├── .gitignore               # Exclude node_modules, logs, media cache, secrets
├── app.js                   # Application configuration, parsers, global middlewares
├── server.js                # Server listener bootstrapper, db hookup, websocket mount
├── nodemon.json             # Dev process reload optimization watch rules
├── package.json             # Node package manifest
└── requirements.txt         # All dependency specifications & architecture blueprint summaries
```

---

## 2. Core Architectural Decisions

### A. Modular Layered Design
Instead of coupling endpoints, payload validations, database calculations, and success wrappers into a single script, they are decoupled across specific layers:
1. **Routing Layer (`/routes`)**: Directs HTTP requests to specific endpoint routes. Appends token guards (`protect`), privileges restrictors (`restrictTo`), and validation layers (`validate(schema)`).
2. **Validation Layer (`/validators`)**: Checks incoming request payloads against highly specific schemas using **Zod** before hitting controllers.
3. **Controller Layer (`/controllers`)**: Holds the core business logic. Extracts request properties, coordinates model updates, formats responses using `ApiResponse`, and fires Socket events.
4. **Data Modeling Layer (`/models`)**: Manages how MongoDB organizes records, indexes geographic indices, hashes passwords on save, and validates query formats.

### B. Geo-Spatial Spherical Queries
By choosing a standard GeoJSON Point schema (`coordinates: [longitude, latitude]`) and registering a **`2dsphere` index** in the `Complaint` collection, Mongoose handles geospatial queries natively. For example, mobile clients can perform spherical radius searches (`$nearSphere` with `$maxDistance`) to find all complaints within a 5-kilometer radius.

### C. Decoupled Complaint History Audit (StatusLog)
Storing detailed transition logs inside the main `Complaint` document causes document size bloat and introduces query overhead. Decoupling status transitions into a separate `StatusLog` collection keeps the database highly performant while ensuring a complete history of updates is recorded.

### D. Safe Error Interceptors
Instead of returning raw server crash logs (e.g. database connect failure traces) that expose system internals, the backend utilizes `ApiError` and `errorHandler`. These tools catch errors and return consistent, sanitized JSON responses, keeping stack traces hidden in production.
