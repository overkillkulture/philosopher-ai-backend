/**
 * Jest Test Setup
 *
 * Runs before all tests
 * Sets up test environment, mocks, and utilities
 */

// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest';

// Global test timeout
jest.setTimeout(10000);

// Console warnings/errors during tests
global.console = {
  ...console,
  // Suppress console.log in tests unless debugging
  log: jest.fn(),
  // Keep errors and warnings visible
  error: console.error,
  warn: console.warn,
};

// Mock external APIs by default
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Mocked AI response' }]
      })
    }
  }))
}));

// Global test utilities
global.testUtils = {
  generateValidEmail: () => `test${Date.now()}@fortress.test`,
  generateValidPassword: () => 'TestPass123!',
  generateValid4DigitPIN: () => '1234',
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

console.log('✅ Test environment initialized');
