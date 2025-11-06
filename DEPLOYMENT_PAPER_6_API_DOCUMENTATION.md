# 📄 DEPLOYMENT PAPER 6: API DOCUMENTATION

**For:** Developers and Beta Testers
**Purpose:** Complete API reference
**Base URL:** `https://cloud-funnel-production.up.railway.app/api/v1`

---

## 🔐 AUTHENTICATION

All protected endpoints require a JWT token in the Authorization header.

### **Getting a Token**

**Login or Register** to receive a token in the response.

**Headers for Protected Routes:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Token Expiration:** 7 days

---

## 📡 API ENDPOINTS

### **1. Health Check**

**GET** `/health`

Check if the backend is running.

**Request:**
```bash
curl https://cloud-funnel-production.up.railway.app/api/v1/health
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-05T17:00:00.000Z"
}
```

**Use Case:** Monitoring, status checks

---

### **2. Register New User**

**POST** `/auth/register`

Create a new user account.

**Request:**
```bash
curl -X POST https://cloud-funnel-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

**Request Body:**
```json
{
  "email": "user@example.com",      // Required, must be valid email
  "password": "SecurePass123!",     // Required, min 8 characters
  "name": "John Doe"                // Optional
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-11-05T17:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid email format
- `400` - Password too short (< 8 characters)
- `409` - Email already exists
- `500` - Server error

---

### **3. Login**

**POST** `/auth/login`

Authenticate existing user.

**Request:**
```bash
curl -X POST https://cloud-funnel-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-11-05T17:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Missing email or password
- `500` - Server error

---

### **4. Get User Profile**

**GET** `/users/profile`

Get the authenticated user's profile.

**🔒 Requires Authentication**

**Request:**
```bash
curl https://cloud-funnel-production.up.railway.app/api/v1/users/profile \
  -H "Authorization: Bearer <your-token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-11-05T17:00:00.000Z",
    "updated_at": "2025-11-05T17:00:00.000Z",
    "consciousness_level": 5,
    "last_login": "2025-11-05T17:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Missing or invalid token
- `404` - User not found
- `500` - Server error

---

### **5. Update User Profile**

**PUT** `/users/profile`

Update the authenticated user's profile.

**🔒 Requires Authentication**

**Request:**
```bash
curl -X PUT https://cloud-funnel-production.up.railway.app/api/v1/users/profile \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "consciousness_level": 7
  }'
```

**Request Body:**
```json
{
  "name": "Jane Doe",              // Optional
  "consciousness_level": 7         // Optional, 1-10
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "Jane Doe",
    "consciousness_level": 7,
    "updated_at": "2025-11-05T17:30:00.000Z"
  }
}
```

**Errors:**
- `401` - Missing or invalid token
- `400` - Invalid data format
- `500` - Server error

---

### **6. Delete Account**

**DELETE** `/users/profile`

Delete the authenticated user's account (irreversible).

**🔒 Requires Authentication**

**Request:**
```bash
curl -X DELETE https://cloud-funnel-production.up.railway.app/api/v1/users/profile \
  -H "Authorization: Bearer <your-token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Errors:**
- `401` - Missing or invalid token
- `500` - Server error

---

### **7. Logout**

**POST** `/auth/logout`

Invalidate the current JWT token.

**🔒 Requires Authentication**

**Request:**
```bash
curl -X POST https://cloud-funnel-production.up.railway.app/api/v1/auth/logout \
  -H "Authorization: Bearer <your-token>"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Frontend should also delete token from localStorage.

---

## 🔒 AUTHENTICATION FLOW

### **1. New User Registration**
```
User fills form → POST /auth/register → Receive token → Store in localStorage → Redirect to dashboard
```

### **2. Existing User Login**
```
User enters credentials → POST /auth/login → Receive token → Store in localStorage → Redirect to dashboard
```

### **3. Accessing Protected Routes**
```
Retrieve token from localStorage → Add to Authorization header → Make API request → Handle response
```

### **4. Token Expiration**
```
Token expires (7 days) → API returns 401 → Clear localStorage → Redirect to login
```

---

## 🛡️ SECURITY

### **Password Requirements**
- Minimum 8 characters
- Stored as bcrypt hash (never plain text)
- Salt rounds: 10

### **JWT Token**
- Algorithm: HS256
- Expiration: 7 days
- Payload: { userId, email }
- Secret: Environment variable

### **CORS Policy**
- Allowed origins configured in environment
- Credentials: Included
- Methods: GET, POST, PUT, DELETE, OPTIONS

### **Rate Limiting**
- Window: 15 minutes
- Max requests: 100 per IP
- Applies to: All endpoints

---

## 📊 RESPONSE FORMATS

### **Success Response**
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

### **Error Response**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

### **Validation Error**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

---

## 🧪 TESTING THE API

### **Using cURL**

**Test health:**
```bash
curl https://cloud-funnel-production.up.railway.app/api/v1/health
```

**Register user:**
```bash
curl -X POST https://cloud-funnel-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","name":"Test User"}'
```

**Login:**
```bash
curl -X POST https://cloud-funnel-production.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'
```

**Get profile (replace <TOKEN>):**
```bash
curl https://cloud-funnel-production.up.railway.app/api/v1/users/profile \
  -H "Authorization: Bearer <TOKEN>"
```

---

### **Using Postman**

**1. Import Collection:**
- Create new collection: "Consciousness Tracking API"
- Add base URL variable: `{{base_url}}` = `https://cloud-funnel-production.up.railway.app/api/v1`

**2. Create Requests:**
- Health Check: GET `{{base_url}}/health`
- Register: POST `{{base_url}}/auth/register`
- Login: POST `{{base_url}}/auth/login`
- Get Profile: GET `{{base_url}}/users/profile`
- Update Profile: PUT `{{base_url}}/users/profile`

**3. Set Authorization:**
- After login, copy token
- Add to Authorization tab: Bearer Token
- Postman will auto-add header

---

### **Using JavaScript (Frontend)**

**Register:**
```javascript
async function register(email, password, name) {
  const response = await fetch('https://cloud-funnel-production.up.railway.app/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, name })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    throw new Error(data.error);
  }
}
```

**Login:**
```javascript
async function login(email, password) {
  const response = await fetch('https://cloud-funnel-production.up.railway.app/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    throw new Error(data.error);
  }
}
```

**Get Profile:**
```javascript
async function getProfile() {
  const token = localStorage.getItem('token');

  const response = await fetch('https://cloud-funnel-production.up.railway.app/api/v1/users/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (data.success) {
    return data.user;
  } else {
    throw new Error(data.error);
  }
}
```

**Update Profile:**
```javascript
async function updateProfile(updates) {
  const token = localStorage.getItem('token');

  const response = await fetch('https://cloud-funnel-production.up.railway.app/api/v1/users/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  } else {
    throw new Error(data.error);
  }
}
```

**Logout:**
```javascript
async function logout() {
  const token = localStorage.getItem('token');

  await fetch('https://cloud-funnel-production.up.railway.app/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
```

---

## 🔧 ERROR HANDLING

### **Common HTTP Status Codes**

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Login required or token expired |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., email) |
| 429 | Too Many Requests | Rate limit exceeded, wait |
| 500 | Server Error | Backend issue, try again later |

### **Handling Errors in Frontend**

```javascript
async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      // Handle HTTP errors
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login.html';
        throw new Error('Session expired');
      } else if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      } else {
        throw new Error(data.error || 'Request failed');
      }
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
```

---

## 📝 REQUEST/RESPONSE EXAMPLES

### **Example 1: Complete Registration Flow**

**Request:**
```http
POST /api/v1/auth/register HTTP/1.1
Host: cloud-funnel-production.up.railway.app
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MTcwMDYwNDc5OX0.abcdefghijklmnopqrstuvwxyz123456789",
  "user": {
    "id": "123456-789-abc",
    "email": "john@example.com",
    "name": "John Doe",
    "created_at": "2025-11-05T17:00:00.000Z"
  }
}
```

---

### **Example 2: Failed Login**

**Request:**
```http
POST /api/v1/auth/login HTTP/1.1
Host: cloud-funnel-production.up.railway.app
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "WrongPassword"
}
```

**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": "Invalid credentials",
  "details": "Email or password is incorrect"
}
```

---

### **Example 3: Update Profile**

**Request:**
```http
PUT /api/v1/users/profile HTTP/1.1
Host: cloud-funnel-production.up.railway.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Smith",
  "consciousness_level": 8
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "123456-789-abc",
    "email": "john@example.com",
    "name": "John Smith",
    "consciousness_level": 8,
    "updated_at": "2025-11-05T18:00:00.000Z"
  }
}
```

---

## 🌐 CORS CONFIGURATION

**Allowed Origins:**
- `https://cloud-funnel-production.up.railway.app` (backend)
- Your frontend URL (Netlify/Vercel)
- `http://localhost:3000` (local development)

**Allowed Headers:**
- Authorization
- Content-Type

**Allowed Methods:**
- GET
- POST
- PUT
- DELETE
- OPTIONS

**Credentials:** Included

---

## 🚀 RATE LIMITING

**Current Limits:**
- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Applies to:** All endpoints

**When Rate Limited:**
```json
{
  "success": false,
  "error": "Too many requests",
  "details": "Rate limit exceeded. Please try again in 15 minutes."
}
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699999999
```

---

## 📚 API VERSIONING

**Current Version:** v1

**Base URL includes version:**
```
https://cloud-funnel-production.up.railway.app/api/v1/...
```

**Future versions will be:**
- `/api/v2/...`
- `/api/v3/...`

**Versioning strategy:** Breaking changes create new version, v1 remains active.

---

## 🧪 API TESTING SCRIPT

**Save as: `test_api.sh`**

```bash
#!/bin/bash

BASE_URL="https://cloud-funnel-production.up.railway.app/api/v1"

echo "Testing API endpoints..."
echo ""

# Test 1: Health check
echo "1. Health Check"
curl -s $BASE_URL/health
echo -e "\n"

# Test 2: Register
echo "2. Register User"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234","name":"Test User"}')
echo $REGISTER_RESPONSE
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "\n"

# Test 3: Login
echo "3. Login"
curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'
echo -e "\n"

# Test 4: Get Profile
echo "4. Get Profile"
curl -s $BASE_URL/users/profile \
  -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "API tests complete!"
```

---

**API DOCUMENTATION STATUS:** ✅ COMPLETE

All 6 deployment papers now ready for go-live! 🚀

📡🔐✅
