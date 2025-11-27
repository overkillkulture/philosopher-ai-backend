/**
 * Test Helper Utilities
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Common utilities for testing API endpoints
 *
 * Usage:
 *   const { createTestUser, authHeaders, mockRequest } = require('./helpers');
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Test constants
const TEST_USER = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  subscription_tier: 'free',
  manipulation_immunity_score: 50,
  is_active: true
};

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest';

/**
 * Generate a valid test JWT token
 * @param {Object} payload - Token payload overrides
 * @returns {string} JWT token
 */
function generateTestToken(payload = {}) {
  const defaultPayload = {
    userId: TEST_USER.id,
    email: TEST_USER.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };

  return jwt.sign({ ...defaultPayload, ...payload }, JWT_SECRET);
}

/**
 * Generate authorization headers with test token
 * @param {Object} tokenPayload - Optional token payload overrides
 * @returns {Object} Headers object
 */
function authHeaders(tokenPayload = {}) {
  const token = generateTestToken(tokenPayload);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Create a mock Express request object
 * @param {Object} overrides
 * @returns {Object} Mock request
 */
function mockRequest(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ip: '127.0.0.1',
    method: 'GET',
    path: '/test',
    get: jest.fn((header) => overrides.headers?.[header]),
    ...overrides
  };
}

/**
 * Create a mock Express response object
 * @returns {Object} Mock response with jest functions
 */
function mockResponse() {
  const res = {
    statusCode: 200,
    data: null
  };

  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });

  res.json = jest.fn((data) => {
    res.data = data;
    return res;
  });

  res.send = jest.fn((data) => {
    res.data = data;
    return res;
  });

  res.setHeader = jest.fn();
  res.set = jest.fn();
  res.get = jest.fn();

  return res;
}

/**
 * Create a mock next function
 * @returns {Function} Jest mock function
 */
function mockNext() {
  return jest.fn();
}

/**
 * Generate unique test email
 * @returns {string}
 */
function generateTestEmail() {
  return `test${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`;
}

/**
 * Generate valid test password
 * @returns {string}
 */
function generateTestPassword() {
  return 'TestPassword123!';
}

/**
 * Hash a password for database insertion
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Create a test user object
 * @param {Object} overrides
 * @returns {Object}
 */
function createTestUser(overrides = {}) {
  return {
    ...TEST_USER,
    email: generateTestEmail(),
    ...overrides
  };
}

/**
 * Wait for a specified time
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock database pool
 * @param {Object} queryResults - Map of query patterns to results
 * @returns {Object} Mock pool
 */
function mockPool(queryResults = {}) {
  return {
    query: jest.fn((text, params) => {
      // Match query patterns
      for (const [pattern, result] of Object.entries(queryResults)) {
        if (text.includes(pattern)) {
          return Promise.resolve(result);
        }
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
    connect: jest.fn(() => Promise.resolve({
      query: jest.fn(),
      release: jest.fn()
    })),
    end: jest.fn()
  };
}

/**
 * Assert API response structure
 * @param {Object} response - Supertest response
 * @param {Object} expectations
 */
function assertResponse(response, expectations = {}) {
  const { status = 200, success = true, hasError = false } = expectations;

  expect(response.status).toBe(status);
  expect(response.body).toHaveProperty('success', success);

  if (hasError) {
    expect(response.body).toHaveProperty('error');
  }

  return response.body;
}

/**
 * Clean test data from database
 * @param {Object} pool - Database pool
 * @param {string} email - Test user email pattern
 */
async function cleanTestData(pool, email = '%@test.com') {
  await pool.query('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', [email]);
  await pool.query('DELETE FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', [email]);
  await pool.query('DELETE FROM users WHERE email LIKE $1', [email]);
}

module.exports = {
  TEST_USER,
  JWT_SECRET,
  generateTestToken,
  authHeaders,
  mockRequest,
  mockResponse,
  mockNext,
  generateTestEmail,
  generateTestPassword,
  hashPassword,
  createTestUser,
  sleep,
  mockPool,
  assertResponse,
  cleanTestData
};
