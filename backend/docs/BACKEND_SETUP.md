# CityFix Backend Setup Guide

This guide provides instructions to help you install, configure, run, and test the CityFix Backend Core REST & WebSockets Services.

---

## 1. Prerequisites

Before setting up the project, ensure you have the following installed on your machine:
* **Node.js:** v18.x or higher (v20+ recommended)
* **npm:** v9.x or higher
* **MongoDB:** A local MongoDB server running on port `27017` OR an active MongoDB Atlas cluster.
* **Git** (for version control operations)

---

## 2. Local Installation

Follow these steps to set up the project locally:

1. **Clone the Repository & Navigate to Backend:**
   ```bash
   cd backend
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   * Copy the template file:
     ```bash
     cp .env.example .env
     ```
   * Open the `.env` file and fill in your custom credentials. By default, it points to `mongodb://localhost:27017/cityfix` for immediate out-of-the-box local development execution.

---

## 3. Running the Server

### Development Mode (Recommended)
This mode starts the server with **nodemon**, which monitors your files and automatically restarts the server when code changes are detected.
```bash
npm run dev
```

### Production Mode
Starts the server normally without reload watch listeners.
```bash
npm start
```

Once running successfully, you should see the following logs in your console:
```
[INFO]: Realtime Socket.IO engine successfully initialized.
[INFO]: CITYFIX BACKEND CORE ONLINE AND LISTEN ON PORT: 5000
[INFO]: Environment Mode: DEVELOPMENT
[INFO]: API Welcome Landing page: http://localhost:5000/
[INFO]: API Healthcheck channel: http://localhost:5000/api/v1/health
```

---

## 4. Verification Check

You can quickly verify that the server is online and responding by running a `curl` request:

```bash
curl http://localhost:5000/api/v1/health
```

You should receive a successful `200 OK` JSON response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service is healthy.",
  "data": {
    "uptime": 2.58,
    "status": "UP",
    "message": "CityFix Core Services online and operational.",
    "timestamp": "2026-05-22T17:15:30.000Z"
  }
}
```

---

## 5. Socket.IO Event Verification

For real-time Socket.IO verification, clients can connect to `http://localhost:5000` and emit the following events:
* **`join_user_room`** (params: `userId`) - Join the user's private notification channel.
* **`join_complaint_room`** (params: `complaintId`) - Join the live timeline updates channel for a specific complaint.
* **`join_admin_room`** - Join the global admin broadcast dashboard.

### Realtime Broadcasts Handled:
* When a citizen files a complaint, all sockets in the `admin_room` receive a **`new_complaint`** event.
* When a complaint's status is updated, sockets in the `complaint_<id>` room receive a **`status_changed`** event, and the citizen receives a **`notification_received`** event.
