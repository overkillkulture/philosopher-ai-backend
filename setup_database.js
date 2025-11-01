/**
 * Database Setup Script
 * Runs the workspace_schema.sql on Railway PostgreSQL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '../../.env.production' });

async function setupDatabase() {
    console.log('🚀 Starting database setup...');

    // Create PostgreSQL connection pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Railway requires SSL
        }
    });

    try {
        // Test connection
        console.log('📡 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful!');

        // Read schema file
        console.log('📖 Reading schema file...');
        const schemaPath = path.join(__dirname, 'database', 'workspace_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('✅ Schema file loaded');

        // Run schema
        console.log('🔨 Creating database tables...');
        await pool.query(schema);
        console.log('✅ Database schema created successfully!');

        // Verify tables exist
        console.log('🔍 Verifying tables...');
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\n📊 Tables created:');
        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        console.log('\n🎉 Database setup complete!');
        console.log('\n📋 Summary:');
        console.log(`   Database: Railway PostgreSQL`);
        console.log(`   Tables: ${result.rows.length}`);
        console.log(`   Status: READY FOR PRODUCTION`);

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run setup
setupDatabase();
