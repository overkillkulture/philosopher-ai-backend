# Philosopher AI Backend - API Reference

**Version:** 1.0.0
**Base URL:** `https://your-domain.railway.app/api/v1`

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### Health Check

#### GET /api/health
Check if the server is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-27T12:00:00.000Z",
  "version": "1.0.0"
}
```

#### GET /api/v1/health
Detailed health check with database status.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-27T12:00:00.000Z"
}
```

---

### Authentication

#### POST /api/v1/auth/register
Register a new user account.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `400` - Invalid email or weak password
- `409` - Email already registered
- `429` - Rate limit exceeded

---

#### POST /api/v1/auth/login
Authenticate and receive a JWT token.

**Rate Limit:** 10 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `429` - Rate limit exceeded

---

#### GET /api/v1/auth/me
Get current authenticated user's profile.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2025-11-27T12:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Invalid or expired token

---

### Conversations

#### POST /api/v1/conversations
Create a new conversation.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "My Conversation",
  "initial_message": "Hello, I have a question..."
}
```

**Response (201):**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "title": "My Conversation",
    "created_at": "2025-11-27T12:00:00.000Z"
  }
}
```

---

#### GET /api/v1/conversations
List all conversations for the authenticated user.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid",
      "title": "My Conversation",
      "created_at": "2025-11-27T12:00:00.000Z",
      "updated_at": "2025-11-27T12:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### GET /api/v1/conversations/:id
Get a specific conversation with messages.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "title": "My Conversation",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Hello",
        "created_at": "2025-11-27T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "Hello! How can I help you?",
        "created_at": "2025-11-27T12:00:01.000Z"
      }
    ]
  }
}
```

**Errors:**
- `404` - Conversation not found

---

#### POST /api/v1/conversations/:id/messages
Add a message to a conversation and get AI response.

**Authentication:** Required

**Request Body:**
```json
{
  "content": "What is consciousness?"
}
```

**Response (200):**
```json
{
  "success": true,
  "user_message": {
    "id": "uuid",
    "role": "user",
    "content": "What is consciousness?"
  },
  "assistant_message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Consciousness is..."
  }
}
```

---

### Payments (Stripe)

#### POST /api/v1/payments/create-intent
Create a Stripe payment intent.

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 1000,
  "currency": "usd"
}
```

**Response (200):**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx"
}
```

---

#### GET /api/v1/payments
Get payment history for the authenticated user.

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "payments": [
    {
      "id": "uuid",
      "amount": 1000,
      "currency": "usd",
      "status": "succeeded",
      "created_at": "2025-11-27T12:00:00.000Z"
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/auth/register` | 5 per 15 min |
| `/auth/login` | 10 per 15 min |
| All other endpoints | 100 per 15 min |

---

## Security Headers

The API includes the following security headers (via Helmet):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)

---

## CORS

Allowed origins are configured via `ALLOWED_ORIGINS` environment variable.

Default allowed:
- `http://localhost:8080`
- `http://localhost:3000`
- `https://consciousnessrevolution.io`

---

*Generated by CP3 C3 Cloud - 2025-11-27*
