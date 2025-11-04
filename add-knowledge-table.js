// Add knowledge table to existing database
// Run this once to add the knowledge table

require('dotenv').config();
const { Pool } = require('pg');

async function addKnowledgeTable() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();

    try {
        console.log('🔍 Checking for knowledge table...');

        // Check if knowledge table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'knowledge'
            );
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Knowledge table already exists');
            return;
        }

        console.log('📋 Creating knowledge table...');
        await client.query('BEGIN');

        // Create knowledge table
        await client.query(`
            CREATE TABLE IF NOT EXISTS knowledge (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                content TEXT NOT NULL,
                source VARCHAR(255) DEFAULT 'cyclotron',
                source_url TEXT,
                categories TEXT[],
                keywords TEXT[],
                priority_score INTEGER DEFAULT 50,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge(created_at)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_priority ON knowledge(priority_score)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_categories ON knowledge USING GIN(categories)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON knowledge USING GIN(keywords)');

        // Add trigger
        await client.query(`
            DROP TRIGGER IF EXISTS update_knowledge_updated_at ON knowledge;
            CREATE TRIGGER update_knowledge_updated_at
                BEFORE UPDATE ON knowledge
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);

        await client.query('COMMIT');
        console.log('✅ Knowledge table created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create knowledge table:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
addKnowledgeTable()
    .then(() => {
        console.log('\n✅ Migration complete - Knowledge table ready');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
