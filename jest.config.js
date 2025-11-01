/**
 * Jest Configuration for Philosopher AI Backend
 *
 * Professional testing setup with coverage tracking
 * Generated during Autonomous Work Session #2 (2025-11-01)
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],

  // Coverage thresholds (professional standards)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout for tests
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>']
};
