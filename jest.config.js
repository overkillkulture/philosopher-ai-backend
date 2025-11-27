/**
 * Jest Configuration for Philosopher AI Backend
 *
 * Professional testing setup with coverage tracking
 * Generated during Autonomous Work Session #2 (2025-11-01)
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration - focus on testable modules
  collectCoverageFrom: [
    'middleware/**/*.js',
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'database/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],

  // Coverage thresholds - disabled until more tests added
  // TODO: Enable when route/middleware tests are implemented
  // coverageThreshold: {
  //   global: {
  //     branches: 20,
  //     functions: 20,
  //     lines: 20,
  //     statements: 20
  //   }
  // },

  // Test match patterns - only Jest tests in tests/__tests__/
  testMatch: [
    '<rootDir>/tests/__tests__/**/*.js',
    '<rootDir>/tests/**/*.test.js'
  ],

  // Ignore old Node test runner files
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/'
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
