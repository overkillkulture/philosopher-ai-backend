-- ================================================
-- ADMIN FIELD MIGRATION
-- ================================================
-- Adds is_admin field for admin dashboard access
-- C1 Mechanic - Production Enhancement
-- ================================================

-- Add admin flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Set first user as admin (optional - for development)
-- UPDATE users SET is_admin = TRUE WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

COMMENT ON COLUMN users.is_admin IS 'Whether user has admin dashboard access';
