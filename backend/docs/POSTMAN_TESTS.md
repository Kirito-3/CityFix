# CityFix Authentication API - Postman Test Requests Reference

This reference document outlines the exact HTTP payloads, headers, parameters, and variable patterns required to configure your Postman workspace or REST client to test the **CityFix Authentication Module**.

---

## 1. Postman Environment Variables

To run these requests fluidly, create a Postman environment containing the following variables:

* `base_url`: `http://localhost:5000/api/v1`
* `token`: *(This will store your active JWT token)*

---

## 2. Request Collections Reference

### A. Signup citizen Account (POST)
Creates a new citizen profile and generates a JWT.

* **Endpoint:** `{{base_url}}/auth/signup`
* **Method:** `POST`
* **Headers:**
  * `Content-Type`: `application/json`
* **Body (JSON):**
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex.mercer@example.com",
    "password": "securePass123",
    "role": "citizen",
    "phone": "9876543210"
  }
  ```
* **Postman Test Script (Optional - Auto-sets Token):**
  ```javascript
  const responseJson = pm.response.json();
  if (responseJson && responseJson.success && responseJson.data.token) {
      pm.environment.set("token", responseJson.data.token);
  }
  ```

---

### B. Signup Admin / Department Authority (POST)
Enables creating specific authority accounts (limited by schemas).

* **Endpoint:** `{{base_url}}/auth/signup`
* **Method:** `POST`
* **Headers:**
  * `Content-Type`: `application/json`
* **Body (JSON):**
  ```json
  {
    "name": "Officer Sarah Connor",
    "email": "sarah.connor@cityfix.gov",
    "password": "officerPass123",
    "role": "authority",
    "phone": "9998887770"
  }
  ```

---

### C. Login User Session (POST)
Authenticates credentials and returns a valid authorization token.

* **Endpoint:** `{{base_url}}/auth/login`
* **Method:** `POST`
* **Headers:**
  * `Content-Type`: `application/json`
* **Body (JSON):**
  ```json
  {
    "email": "alex.mercer@example.com",
    "password": "securePass123"
  }
  ```
* **Postman Test Script (Optional - Auto-sets Token):**
  ```javascript
  const responseJson = pm.response.json();
  if (responseJson && responseJson.success && responseJson.data.token) {
      pm.environment.set("token", responseJson.data.token);
  }
  ```

---

### D. Get Current Profile Context (GET)
Secured endpoint retrieving currently authenticated context using Bearer headers.

* **Endpoint:** `{{base_url}}/auth/me`
* **Method:** `GET`
* **Headers:**
  * `Authorization`: `Bearer {{token}}`
* **Body:** None (empty)

---

## 3. Complaint Management Module Reference

Enables citizens to file complaints, and allows admins/authorities to search and manage status lifecycles.

### A. File a Civic Complaint (POST)
Filing a new issue as an authenticated citizen.

* **Endpoint:** `{{base_url}}/complaints`
* **Method:** `POST`
* **Headers:**
  * `Authorization`: `Bearer {{token}}`
  * `Content-Type`: `application/json`
* **Body (JSON):**
  ```json
  {
    "title": "Severe Pothole on Market Street",
    "description": "A very large pothole causing major vehicle damages and traffic slow-down near the bakery.",
    "category": "pothole",
    "priority": "high",
    "longitude": 77.5946,
    "latitude": 12.9716,
    "address": "Market Street, Sector 3, Bengaluru",
    "images": ["https://res.cloudinary.com/cityfix/image/upload/sample_pothole.jpg"]
  }
  ```

---

### B. Retrieve Complaints List (GET)
Returns paginated, filtered complaints. Citizens see their own; Admins see all.

* **Endpoint:** `{{base_url}}/complaints`
* **Method:** `GET`
* **Headers:**
  * `Authorization`: `Bearer {{token}}`
* **Parameters (Optional):**
  * `status`: `Submitted`
  * `category`: `pothole`
  * `priority`: `high`
  * `page`: `1`
  * `limit`: `10`
  * `lat`: `12.9716`
  * `lng`: `77.5946`
  * `distance`: `5000`

---

### C. Retrieve Complaint Detail & History Timeline (GET)
Fetches chronological StatusLog transitions and detailed complaint fields.

* **Endpoint:** `{{base_url}}/complaints/:id`
* **Method:** `GET`
* **Headers:**
  * `Authorization`: `Bearer {{token}}`

---

### D. Update Complaint Status (PATCH)
Strictly restricted to Admin role. Changes status, sends realtime socket notifies, and updates reporter timeline log.

* **Endpoint:** `{{base_url}}/complaints/:id/status`
* **Method:** `PATCH`
* **Headers:**
  * `Authorization`: `Bearer {{admin_token}}`
  * `Content-Type`: `application/json`
* **Body (JSON):**
  ```json
  {
    "status": "In Progress",
    "remarks": "Assigned road engineering team to fill the pothole."
  }
  ```

---

## 4. Sample Error Responses

You can test validation limits by passing malformed values. The system will reply using standardized envelopes:

### Email Collision Failure (400 Bad Request)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Registration failed: A user with this email address already exists."
}
```

### Phone Collision Failure (400 Bad Request)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Registration failed: A user with this phone number already exists."
}
```

### Zod Validation Schema Reject (400 Bad Request)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Request validation failed: Password must be at least 6 characters long",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 6 characters long"
    }
  ]
}
```

### Access Gated Without Token (401 Unauthorized)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access denied: Authentication token required."
}
```
