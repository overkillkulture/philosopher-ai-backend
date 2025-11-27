/**
 * AUTHENTICATION TESTS
 * Complete test suite for auth system
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Authentication System', () => {
  const testEmail = 'auth.test@example.com';
  const testPassword = 'SecurePass123!@#';

  afterEach(async () => {
    await global.testHelpers.cleanupTestData();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe(testEmail);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await global.testHelpers.createTestUser(testEmail);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: testPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('email');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('password');
    });

    it('should hash password before storing', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword
        });

      const user = await global.testHelpers.getUserByEmail(testEmail);
      expect(user.password_hash).not.toBe(testPassword);
      expect(user.password_hash).toMatch(/^\$2[aby]\$/); // bcrypt format
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      await global.testHelpers.createTestUser(testEmail, hashedPassword);
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokens');
    });

    it('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword
        });

      expect(response.status).toBe(401);
    });

    it('should generate valid JWT tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      const { accessToken, refreshToken } = response.body.data.tokens;

      // Verify access token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('userId');
      expect(decoded.email).toBe(testEmail);

      // Verify refresh token
      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      expect(decodedRefresh).toHaveProperty('userId');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let validRefreshToken;

    beforeEach(async () => {
      const user = await global.testHelpers.createTestUser(testEmail);
      validRefreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: validRefreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid.token.here'
        });

      expect(response.status).toBe(401);
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-id' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1d' } // Expired yesterday
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: expiredToken
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      const user = await global.testHelpers.createTestUser(testEmail);
      accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken
        });

      expect(response.status).toBe(204);
    });

    it('should reject logout without auth', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          refreshToken
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      const requests = [];

      // Make 10 rapid login attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: testEmail,
              password: 'wrong'
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
