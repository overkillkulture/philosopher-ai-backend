#!/usr/bin/env node
/**
 * Database Seed Script
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Usage: node scripts/seed-db.js
 * Creates test data for development
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  console.log('\n🌱 DATABASE SEED\n');
  console.log('═'.repeat(50));

  const client = await pool.connect();

  try {
    // Create test user
    console.log('\n📝 Creating test user...');
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);

    const userResult = await client.query(`
      INSERT INTO users (email, password, name, subscription_tier)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET name = $3
      RETURNING id, email, name
    `, ['test@example.com', passwordHash, 'Test User', 'free']);

    const user = userResult.rows[0];
    console.log(`   ✅ User: ${user.email} (ID: ${user.id})`);

    // Create test conversation
    console.log('\n💬 Creating test conversation...');
    const convResult = await client.query(`
      INSERT INTO conversations (user_id, title)
      VALUES ($1, $2)
      RETURNING id, title
    `, [user.id, 'Test Conversation']);

    const conversation = convResult.rows[0];
    console.log(`   ✅ Conversation: ${conversation.title} (ID: ${conversation.id})`);

    // Create test messages
    console.log('\n📨 Creating test messages...');
    await client.query(`
      INSERT INTO messages (conversation_id, role, content)
      VALUES
        ($1, 'user', 'Hello, this is a test message.'),
        ($1, 'assistant', 'Hello! I am the Philosopher AI. How can I help you today?'),
        ($1, 'user', 'What is consciousness?'),
        ($1, 'assistant', 'Consciousness is the state of being aware of and responsive to one''s surroundings. It involves subjective experience, self-awareness, and the ability to perceive and process information about the world and oneself.')
    `, [conversation.id]);
    console.log('   ✅ 4 test messages created');

    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ SEED COMPLETE\n');
    console.log('Test credentials:');
    console.log('  Email: test@example.com');
    console.log('  Password: TestPassword123!\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
