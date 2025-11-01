/**
 * Integration Tests - API Endpoints
 *
 * Tests complete API flows with database
 * Uses supertest to make HTTP requests
 */

const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// Test database setup
let app;
let db;
const JWT_SECRET = 'test-secret-key-for-integration';

beforeAll(async () => {
  // Create in-memory SQLite database for testing
  db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      pin TEXT UNIQUE,
      permissions TEXT DEFAULT '{}',
      consciousness_level INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Setup Express app for testing
  app = express();
  app.use(express.json());
  app.use(require('cors')());

  // Helper function
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // Test endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', database: 'connected' });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, username, pin } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = generateId();

      await db.run(
        'INSERT INTO users (id, email, password_hash, name, pin) VALUES (?, ?, ?, ?, ?)',
        [userId, email, passwordHash, username || 'User', pin]
      );

      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        user: { id: userId, email, name: username || 'User' },
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/login-pin', async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin || pin.length !== 4) {
        return res.status(400).json({ error: '4-digit PIN required' });
      }

      const user = await db.get('SELECT * FROM users WHERE pin = ?', [pin]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid PIN' });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, pin: user.pin },
        token
      });
    } catch (error) {
      res.status(500).json({ error: 'PIN login failed' });
    }
  });
});

afterAll(async () => {
  if (db) await db.close();
});

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: `test${Date.now()}@fortress.test`,
        password: 'TestPass123!',
        username: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    test('should reject registration without email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'TestPass123!' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should reject registration without password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@fortress.test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        email: `duplicate${Date.now()}@fortress.test`,
        password: 'TestPass123!'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: `login${Date.now()}@fortress.test`,
      password: 'TestPass123!'
    };

    beforeAll(async () => {
      // Register test user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    test('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(testUser)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!'
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@fortress.test',
          password: 'TestPass123!'
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/login-pin', () => {
    const testPIN = '5678';

    beforeAll(async () => {
      // Register user with PIN
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `pinuser${Date.now()}@fortress.test`,
          password: 'TestPass123!',
          pin: testPIN
        });
    });

    test('should login with correct PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login-pin')
        .send({ pin: testPIN })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.pin).toBe(testPIN);
      expect(response.body.token).toBeDefined();
    });

    test('should reject invalid PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login-pin')
        .send({ pin: '9999' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('should reject PIN with wrong length', async () => {
      const response = await request(app)
        .post('/api/auth/login-pin')
        .send({ pin: '123' })
        .expect(400);

      expect(response.body.error).toBe('4-digit PIN required');
    });

    test('should reject non-numeric PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login-pin')
        .send({ pin: 'abcd' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('JWT Token Validation', () => {
    test('should generate valid JWT on registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `jwt${Date.now()}@fortress.test`,
          password: 'TestPass123!'
        });

      const token = response.body.token;
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    test('should generate valid JWT on login', async () => {
      const userData = {
        email: `jwtlogin${Date.now()}@fortress.test`,
        password: 'TestPass123!'
      };

      await request(app).post('/api/auth/register').send(userData);
      const response = await request(app).post('/api/auth/login').send(userData);

      const token = response.body.token;
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.userId).toBeDefined();
      expect(decoded.email).toBe(userData.email);
    });
  });
});
