/**
 * Database Connection Module
 * Provides PostgreSQL connection pool for routes
 *
 * Usage:
 *   const pool = require('../database/db');
 *   const result = await pool.query('SELECT * FROM users');
 */

const { Pool } = require('pg');

// Database configuration from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection fails
});

// Log connection events in development
if (process.env.NODE_ENV !== 'production') {
  pool.on('connect', () => {
    console.log('📦 Database: New client connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Database: Unexpected error on idle client', err);
  });
}

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database: Connection pool initialized'))
  .catch(err => console.warn('⚠️ Database: Connection test failed -', err.message));

module.exports = pool;
