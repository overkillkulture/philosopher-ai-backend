// PostgreSQL Database Migration Script
// Compatible with Railway PostgreSQL deployment

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false // Required for Railway PostgreSQL
    } : false
});

console.log('🚀 Starting PostgreSQL database migration...\n');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Database:', process.env.DATABASE_URL ? 'Connected via DATABASE_URL' : 'Using fallback config\n');

async function runMigrations() {
    const client = await pool.connect();

    try {
        // Start transaction
        await client.query('BEGIN');

        console.log('📋 Running migrations...\n');

        // Migration 1: Create users table
        console.log('  → Creating users table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                pin_hash VARCHAR(255),
                subscription_tier VARCHAR(50) DEFAULT 'free',
                anthropic_api_key VARCHAR(255),
                manipulation_immunity_score FLOAT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                failed_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                email_verified BOOLEAN DEFAULT false,
                verification_token VARCHAR(255),
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP
            )
        `);
        console.log('    ✅ Users table ready');

        // Migration 2: Create sessions table
        console.log('  → Creating sessions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(50),
                user_agent TEXT
            )
        `);
        console.log('    ✅ Sessions table ready');

        // Migration 3: Create conversations table
        console.log('  → Creating conversations table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                archived BOOLEAN DEFAULT false
            )
        `);
        console.log('    ✅ Conversations table ready');

        // Migration 4: Create messages table
        console.log('  → Creating messages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                role VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                manipulation_detected BOOLEAN DEFAULT false,
                manipulation_score FLOAT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('    ✅ Messages table ready');

        // Migration 5: Create payments table
        console.log('  → Creating payments table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_payment_id VARCHAR(255) UNIQUE,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                status VARCHAR(50) NOT NULL,
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('    ✅ Payments table ready');

        // Migration 6: Create indexes for performance
        console.log('  → Creating indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)');
        console.log('    ✅ Indexes created');

        // Migration 7: Create updated_at trigger function
        console.log('  → Creating trigger functions...');
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

        // Add triggers to tables
        await client.query(`
            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
            CREATE TRIGGER update_conversations_updated_at
                BEFORE UPDATE ON conversations
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        console.log('    ✅ Triggers created');

        // Commit transaction
        await client.query('COMMIT');

        console.log('\n✅ All migrations completed successfully!');
        console.log('\n📊 Database ready for production use.\n');

        // Verify tables
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 Tables created:');
        result.rows.forEach(row => {
            console.log(`   • ${row.table_name}`);
        });

    } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migrations
runMigrations()
    .then(() => {
        console.log('\n🎉 Migration script completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Migration script failed:', error.message);
        process.exit(1);
    });
