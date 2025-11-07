-- ================================================
-- AUTH EXTENSIONS MIGRATION
-- ================================================
-- Adds password reset, email verification, and profile fields
-- C1 Mechanic - Production Enhancement
-- ================================================

-- Add password reset fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Add email verification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expiry TIMESTAMP;

-- Add profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token_hash);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Update existing users to have email_verified = TRUE (migration safety)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

COMMENT ON COLUMN users.reset_token_hash IS 'SHA256 hash of password reset token';
COMMENT ON COLUMN users.email_verification_token_hash IS 'SHA256 hash of email verification token';
COMMENT ON COLUMN users.email_verified IS 'Whether user email has been verified';
COMMENT ON COLUMN users.preferences IS 'User preferences and settings as JSON';
