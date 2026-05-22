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

## 3. Sample Error Responses

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
