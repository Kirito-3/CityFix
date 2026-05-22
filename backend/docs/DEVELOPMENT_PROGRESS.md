# CityFix Backend Development Progress

This file serves as a live document to track completed features, pending milestones, design choices, and next steps for the CityFix backend system.

---

## 1. Project Overview

* **Current Module:** Phase 1: Core Architecture & Setup
* **Current Status:** 🟢 Completed & Operational

---

## 2. Completed Milestones

### Phase 1: Architecture & Foundations
* [x] **Project Scaffolding:** Initialized backend project, configured `package.json` for ES Modules (`"type": "module"`), and configured nodemon auto-restart limits.
* [x] **Environment Configurations:** Documented key parameters in `.env.example` and generated `.env` for local testing fallback.
* [x] **Base Utilities:** Created a generic Winston-ready `logger` utility, generic async router wrapper `asyncHandler`, and standard wrappers `ApiError` and `ApiResponse` for consistent HTTP payloads.
* [x] **Global Middlewares:** Added a global `errorHandler` to sanitize stack traces, a Zod-based request validator `validateMiddleware`, and an IP-based request `rateLimiter`.
* [x] **Data Modeling Layer:**
  * Created `User` schema (password hashing, comparisons, FCM lists).
  * Created `Complaint` schema utilizing a GeoJSON Point coordinate structure and a native `2dsphere` index.
  * Created `StatusLog` schema for complaint timeline tracking.
  * Created `Notification` schema.
* [x] **API v1 Module Routing:** Set up authentication routes (`/auth`), complaints routes (`/complaints`), administrator dashboard routes (`/admin`), and alert routes (`/notifications`).
* [x] **Authentication Module Completeness:** Fully implemented signup (`POST /signup`), login (`POST /login`), getMe (`GET /me`), custom Zod checks, email/phone uniqueness validations, and verified logic using programmatic integration scripts.
* [x] **Express & Server Integration:** Programmed `app.js` and `server.js` and separated execution routines for easier automated endpoint testing.
* [x] **Real-time WebSockets:** Established a modular Socket.IO wrapper split into `sockets/index.js` (for bootstrapping) and `sockets/complaint.socket.js` (for managing room subscriptions).
* [x] **Technical Documentation:** Written complete guides for project directories, REST endpoint routes, setup instructions, and Postman reference parameters.

---

## 3. Pending Milestones

### Phase 2: User Access & Profile Enhancements
* [x] **Complete Authentication Module:** Fully integrated credential verification layers, token expiration controls, password encryption, and duplicate checks.
* [ ] **Google OAuth Sign-in integration** for quicker citizen registration.
* [ ] **Multer Media Storage hookups** with Cloudinary configurations for processing real images uploaded by citizens.
* [ ] **FCM Push Notification integrations** to trigger standard mobile push alerts when app sockets are offline.

### Phase 3: Analytics & Mapping Engines
* [ ] **Advanced GeoJSON query channels** (e.g. fetching all complaints within a dynamic polygon or path).
* [ ] **Civic Hotspot calculations** to map high-density complaint clusters.

---

## 4. Next Implementation Steps

1. **Local Boot Verification:** Start the server with `npm run dev` and query `/api/v1/health` to confirm core files load without errors.
2. **Cloudinary Asset Storage Connection:** Fill in credentials in `config/cloudinary.js` to enable image upload routing using Multer.
3. **Database Seed Script:** Create a mock database seeder inside a scratch folder to pre-populate mock citizen accounts, authority accounts, and complaints.
4. **Flutter Integration:** Connect the Flutter app client using the REST endpoints documented in `docs/API_STRUCTURE.md` and check real-time Socket updates.

---

## 5. Architectural Decisions Log

| Decision Date | Area | Choice | Rationale |
| :--- | :--- | :--- | :--- |
| 2026-05-22 | Module Loader | **ES Modules (`import`)** | Modern industry alignment, native performance optimizations, and clean imports. |
| 2026-05-22 | Testing Prep | **Separation of App & Server** | `app.js` builds routes and middlewares without binding to a network port, allowing testing tools (like supertest) to run tests programmatically without port collisions. |
| 2026-05-22 | Payload Validation| **Zod Engine** | Type-safe runtime schema parsing that automatically rejects malformed requests before they hit controllers. |
| 2026-05-22 | Spatial Querying | **GeoJSON & 2dsphere Index** | Enables precise radial proximity queries, allowing citizens to find issues reported nearby and mapping hotspots. |
| 2026-05-22 | Data Integrity | **Decoupled StatusLog Schema** | Decoupling complaint lifecycle changes from the main Complaint collection prevents document size bloat and ensures a clean audit log. |
| 2026-05-22 | Platform Logging | **Unified Console Logger** | Decouples logging calls from specific Winston/Pino SDK methods, allowing us to upgrade our logging driver by editing just one file. |
