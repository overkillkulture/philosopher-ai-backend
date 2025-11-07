// ================================================
// FIX LEGACY PASSWORD COLUMN
// ================================================
// The database has both 'password' and 'password_hash' columns
// The old 'password' column has NOT NULL constraint causing failures
// This script makes it nullable
// ================================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixLegacyPasswordColumn() {
    const client = await pool.connect();

    try {
        console.log('🔧 Fixing legacy password column...\n');

        await client.query('BEGIN');

        // Check if password column exists
        const columnCheck = await client.query(`
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('password', 'password_hash')
            ORDER BY column_name;
        `);

        console.log('📋 Current password-related columns:');
        columnCheck.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
        });

        // Make old password column nullable (if it exists)
        try {
            await client.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);
            console.log('\n  ✓ Removed NOT NULL constraint from password column');
        } catch (err) {
            console.log(`\n  ℹ password column handling: ${err.message.substring(0, 60)}`);
        }

        await client.query('COMMIT');

        console.log('\n✅ Legacy password column fixed!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Fix failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

fixLegacyPasswordColumn();
