# CityFix REST API Reference Guide

This document catalogs all endpoints, parameters, request payloads, and security mechanisms currently active on the CityFix Backend REST API version 1.

---

## 1. Global API Parameters

* **Base URL:** `http://localhost:5000/api/v1`
* **Response Format:** JSON
* **Auth Scheme:** Bearer Token via HTTP Header: `Authorization: Bearer <JWT_TOKEN>`

### Success Envelope Structure
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable description",
  "data": { ... }
}
```

### Error Envelope Structure
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Descriptive error message",
  "errors": [
    {
      "field": "body_parameter_name",
      "message": "Field specific failure explanation"
    }
  ]
}
```

---

## 2. API Endpoint Registry

### A. Health & Root

#### `GET /`
* **Access:** Public
* **Purpose:** Welcome landing page showing API metadata.

#### `GET /health`
* **Access:** Public
* **Purpose:** Health check system metrics.
* **Response Data:**
  ```json
  {
    "uptime": 12.35,
    "status": "UP",
    "message": "CityFix Core Services online and operational.",
    "timestamp": "2026-05-22T17:00:00.000Z"
  }
  ```

---

### B. Authentication Module (`/auth`)

#### `POST /auth/signup`
* **Access:** Public (Guest)
* **Purpose:** Register a citizen or authority account.
* **Payload Requirements:**
  * `name`: String (2-50 characters), required.
  * `email`: String (valid format), unique, required. If a profile already exists with this email, returns `400 Bad Request`.
  * `password`: String (minimum 6 characters), required.
  * `role`: Optional enum (`citizen`, `authority`, `admin`), defaults to `citizen`.
  * `phone`: String (minimum 10 characters), unique, optional. If provided and already registered by another user, returns `400 Bad Request`.
* **Payload (JSON):**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "securepassword123",
    "role": "citizen",
    "phone": "9876543210"
  }
  ```
* **Response Data:** Returns the created user object (excluding the hashed password) and a JWT authorization token.

#### `POST /auth/login`
* **Access:** Public (Guest)
* **Purpose:** Authenticate credentials and retrieve JWT.
* **Payload (JSON):**
  ```json
  {
    "email": "john.doe@example.com",
    "password": "securepassword123"
  }
  ```
* **Response Data:** Returns user details and the JWT token.

#### `GET /auth/me`
* **Access:** Private (Authenticated users)
* **Purpose:** Retrieve the profile details of the currently logged-in user.

---

### C. Complaints Module (`/complaints`)

#### `POST /complaints`
* **Access:** Private (Citizens only)
* **Purpose:** File a new civic issue report.
* **Payload (JSON):**
  ```json
  {
    "title": "Water pipeline burst",
    "description": "Clean drinking water is leaking rapidly on Main Street.",
    "category": "water_leakage", // enum: ['pothole', 'garbage', 'drainage', 'water_leakage', 'streetlight', 'other']
    "priority": "high", // enum: ['low', 'medium', 'high'], default: 'medium' (Optional)
    "longitude": 77.5946,
    "latitude": 12.9716,
    "address": "12 Main Street, Sector 4",
    "images": ["https://res.cloudinary.com/demo/image/upload/sample.jpg"] // Optional
  }
  ```

#### `GET /complaints`
* **Access:** Private (Citizens see their own reports unless query is geospatial; Admins see all filtered reports)
* **Purpose:** Query complaints list with pagination, sorting, and filtration.
* **Query Parameters:**
  * `status`: Filter by state (`Submitted`, `Under Review`, `Assigned`, `In Progress`, `Resolved`, `Rejected`)
  * `category`: Filter by category
  * `priority`: Filter by priority (`low`, `medium`, `high`)
  * `page`: Page index (default: `1`)
  * `limit`: Page count (default: `10`)
  * `lat` & `lng`: Triggers geospatial search. Requires both coordinate parameters to return complaints ordered by proximity.
  * `distance`: Search radius limit in meters (default: `5000` = 5km)

#### `GET /complaints/:id`
* **Access:** Private (Reporting Citizen, assigned Authority, or Admin)
* **Purpose:** Retrieve complaint details along with the full status timeline logs showing chronological transitions (`StatusLog` collection).

#### `PATCH /complaints/:id/status`
* **Access:** Private (Admin only)
* **Purpose:** Update the progress status of an issue. Every update appends a detailed audit track record inside the `StatusLog` collection and pushes real-time mobile/admin socket updates.
* **Payload (JSON):**
  ```json
  {
    "status": "Under Review", // enum: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected']
    "remarks": "The pipeline has been patched and road resurfaced." // Optional
  }
  ```

---

### D. Administrative Module (`/admin`)

#### `GET /admin/stats`
* **Access:** Private (Admin only)
* **Purpose:** Fetch system-wide usage metrics, active user breakdowns, complaint progress counts, and category statistics.

#### `PATCH /admin/complaints/:id/assign`
* **Access:** Private (Admin only)
* **Purpose:** Assign a department authority to resolve an issue. This automatically transitions the complaint to `under_review`.
* **Payload (JSON):**
  ```json
  {
    "authorityId": "603d21b3e6a21820b41cd8d4" // Valid User ID with 'authority' role
  }
  ```

---

### E. In-App Notifications Module (`/notifications`)

#### `GET /notifications`
* **Access:** Private (Authenticated users)
* **Purpose:** Fetch historical alerts.
* **Query Parameters:**
  * `unreadOnly`: Set to `true` to return only unread notifications.

#### `PATCH /notifications/:id/read`
* **Access:** Private (Notification recipient)
* **Purpose:** Mark a single alert as read.

#### `PATCH /notifications/read-all`
* **Access:** Private (Notification recipient)
* **Purpose:** Mark all unread notifications as read.
