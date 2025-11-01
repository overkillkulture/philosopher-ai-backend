-- ===============================================================================
-- WORKSPACE DATABASE SCHEMA
-- ===============================================================================
-- Purpose: Store AI workspace conversations and messages
-- Created: 2025-10-31
-- Ready to run when PostgreSQL database connects
-- ===============================================================================

-- CONVERSATIONS TABLE
-- Stores each conversation/chat session
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(500) DEFAULT 'New Conversation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Foreign key to users table (will be created later)
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

    -- Index for faster queries
    INDEX idx_user_conversations (user_id, created_at DESC),
    INDEX idx_active_conversations (user_id, is_deleted, updated_at DESC)
);

-- MESSAGES TABLE
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to conversations
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,

    -- Index for faster message loading
    INDEX idx_conversation_messages (conversation_id, created_at ASC)
);

-- FILES TABLE (for file uploads in conversations)
CREATE TABLE IF NOT EXISTS conversation_files (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    message_id INTEGER,
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL,

    INDEX idx_conversation_files (conversation_id, uploaded_at DESC)
);

-- WORKSPACE SETTINGS TABLE (user preferences)
CREATE TABLE IF NOT EXISTS workspace_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    default_model VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20241022',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    system_prompt TEXT,
    dark_mode BOOLEAN DEFAULT TRUE,
    auto_title BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

    INDEX idx_user_settings (user_id)
);

-- TRIGGERS
-- Auto-update updated_at timestamp on conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Auto-update parent conversation when message is added
CREATE OR REPLACE FUNCTION update_parent_conversation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_conversation
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_conversation();

-- VIEWS
-- View for conversation list with last message preview
CREATE OR REPLACE VIEW conversation_list AS
SELECT
    c.id,
    c.user_id,
    c.title,
    c.created_at,
    c.updated_at,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    (
        SELECT content
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) as last_message_preview
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.is_deleted = FALSE
GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;

-- SAMPLE DATA (for testing)
-- Uncomment to insert sample conversation

/*
INSERT INTO conversations (user_id, title)
VALUES (1, 'Getting Started with AI Workspace');

INSERT INTO messages (conversation_id, role, content)
VALUES
    (1, 'user', 'Hello! How does this workspace work?'),
    (1, 'assistant', 'Welcome to your AI workspace! This is where you can chat with AI, save your conversations, upload files, and collaborate on projects. Each conversation is automatically saved, and you can access your history anytime. What would you like to work on?'),
    (1, 'user', 'Can you help me write a business plan?'),
    (1, 'assistant', 'Absolutely! I''d be happy to help you create a business plan. Let''s start with the basics:\n\n1. What type of business are you planning?\n2. Who is your target market?\n3. What problem does your business solve?\n\nTell me about your business idea, and we''ll build a comprehensive plan together!');
*/

-- ===============================================================================
-- MIGRATION NOTES
-- ===============================================================================
--
-- To run this schema:
-- 1. Connect to your PostgreSQL database
-- 2. Run: psql -d your_database -f workspace_schema.sql
--
-- Or from Node.js:
-- const { Pool } = require('pg');
-- const pool = new Pool({ connectionString: process.env.DATABASE_URL });
-- const schema = fs.readFileSync('workspace_schema.sql', 'utf8');
-- await pool.query(schema);
--
-- ===============================================================================
