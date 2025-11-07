// ================================================
// DATABASE SCHEMA FIX
// ================================================
// Adds missing columns to existing users table
// Run once on Railway: railway run node fix-database-schema.js
// ================================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixDatabaseSchema() {
    const client = await pool.connect();

    try {
        console.log('🔧 Fixing database schema...\n');

        // Check current users table structure
        console.log('📋 Checking current users table...');
        const columnsResult = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('\nCurrent columns:');
        columnsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        await client.query('BEGIN');

        // Add missing columns (IF NOT EXISTS prevents errors)
        console.log('\n🔨 Adding missing columns...');

        const alterCommands = [
            // C1's new columns
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS consciousness_level INTEGER DEFAULT 0',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_used_this_month INTEGER DEFAULT 0',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_limit INTEGER DEFAULT 3',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_date DATE DEFAULT CURRENT_DATE',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMP',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT \'{}\'',

            // Indexes
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true'
        ];

        for (const cmd of alterCommands) {
            try {
                await client.query(cmd);
                console.log(`  ✓ ${cmd.substring(0, 60)}...`);
            } catch (err) {
                console.log(`  ⚠ ${cmd.substring(0, 60)}... (${err.message.substring(0, 50)})`);
            }
        }

        // Create missing tables
        console.log('\n📊 Creating missing tables...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                question_category VARCHAR(100),
                consciousness_boost INTEGER DEFAULT 0,
                conversation_id VARCHAR(255),
                response_time_ms INTEGER,
                tokens_used INTEGER,
                model_used VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ questions table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                tier VARCHAR(50) NOT NULL,
                stripe_subscription_id VARCHAR(255) UNIQUE,
                stripe_customer_id VARCHAR(255),
                stripe_price_id VARCHAR(255),
                amount_cents INTEGER,
                status VARCHAR(50) NOT NULL,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ subscriptions table');

        await client.query(`
            CREATE TABLE IF NOT EXISTS usage_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                event_type VARCHAR(100) NOT NULL,
                event_data JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✓ usage_logs table');

        // Create database functions
        console.log('\n⚙️ Creating database functions...');

        await client.query(`
            CREATE OR REPLACE FUNCTION can_user_ask_question(p_user_id INTEGER)
            RETURNS BOOLEAN AS $$
            DECLARE
                v_tier VARCHAR(50);
                v_questions_used INTEGER;
                v_questions_limit INTEGER;
            BEGIN
                SELECT tier, questions_used_this_month, questions_limit
                INTO v_tier, v_questions_used, v_questions_limit
                FROM users WHERE id = p_user_id;

                IF v_tier = 'free' THEN
                    RETURN v_questions_used < v_questions_limit;
                ELSE
                    RETURN true;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✓ can_user_ask_question()');

        await client.query(`
            CREATE OR REPLACE FUNCTION reset_monthly_questions()
            RETURNS void AS $$
            BEGIN
                UPDATE users
                SET questions_used_this_month = 0,
                    reset_date = CURRENT_DATE
                WHERE reset_date < DATE_TRUNC('month', CURRENT_DATE);
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('  ✓ reset_monthly_questions()');

        await client.query('COMMIT');

        console.log('\n✅ Database schema fixed successfully!\n');

        // Show updated structure
        const updatedColumns = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('📋 Updated users table columns:');
        updatedColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Schema fix failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixDatabaseSchema();
