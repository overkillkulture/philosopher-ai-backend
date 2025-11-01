/**
 * 🔄 DATABASE MIGRATION SYSTEM
 *
 * Run migrations to update database schema
 *
 * Usage:
 *   node migrate.js up    - Run all pending migrations
 *   node migrate.js down  - Rollback last migration
 *   node migrate.js status - Show migration status
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, 'consciousness.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function getDatabase() {
    return await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
}

async function getAppliedMigrations(db) {
    try {
        const result = await db.all('SELECT migration_name FROM migrations ORDER BY id');
        return result.map(row => row.migration_name);
    } catch (error) {
        // Migrations table doesn't exist yet
        return [];
    }
}

async function getAllMigrations() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.log('⚠️  No migrations directory found');
        return [];
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql'))
        .sort();

    return files;
}

async function runMigration(db, migrationFile) {
    const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`📝 Running migration: ${migrationFile}`);

    try {
        await db.exec(sql);
        console.log(`✅ Migration successful: ${migrationFile}`);
        return true;
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`);
        console.error(error.message);
        return false;
    }
}

async function migrateUp() {
    console.log('\n🔄 Running migrations...\n');

    const db = await getDatabase();
    const applied = await getAppliedMigrations(db);
    const all = await getAllMigrations();

    const pending = all.filter(migration => !applied.includes(migration.replace('.sql', '')));

    if (pending.length === 0) {
        console.log('✅ No pending migrations. Database is up to date!\n');
        await db.close();
        return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    for (const migration of pending) {
        const success = await runMigration(db, migration);
        if (!success) {
            console.error('\n❌ Migration stopped due to error\n');
            await db.close();
            process.exit(1);
        }
    }

    console.log('\n✅ All migrations completed successfully!\n');
    await db.close();
}

async function migrationStatus() {
    console.log('\n📊 Migration Status\n');

    const db = await getDatabase();
    const applied = await getAppliedMigrations(db);
    const all = await getAllMigrations();

    console.log('Applied migrations:');
    if (applied.length === 0) {
        console.log('  (none)');
    } else {
        applied.forEach(migration => {
            console.log(`  ✅ ${migration}`);
        });
    }

    console.log('\nPending migrations:');
    const pending = all.filter(migration => !applied.includes(migration.replace('.sql', '')));
    if (pending.length === 0) {
        console.log('  (none)');
    } else {
        pending.forEach(migration => {
            console.log(`  ⏳ ${migration}`);
        });
    }

    console.log(`\nTotal: ${applied.length} applied, ${pending.length} pending\n`);

    await db.close();
}

async function main() {
    const command = process.argv[2] || 'up';

    switch (command) {
        case 'up':
            await migrateUp();
            break;

        case 'status':
            await migrationStatus();
            break;

        case 'down':
            console.log('⚠️  Rollback not implemented yet. Use migrations carefully!');
            break;

        default:
            console.log('Usage: node migrate.js [up|down|status]');
            console.log('  up     - Run all pending migrations');
            console.log('  down   - Rollback last migration (not implemented)');
            console.log('  status - Show migration status');
            process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ Migration system error:', error);
    process.exit(1);
});
