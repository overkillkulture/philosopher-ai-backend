-- ================================================
-- PHILOSOPHER AI - POSTGRESQL DATABASE SCHEMA
-- ================================================
-- Created: 2025-10-10
-- Purpose: Complete database schema for Philosopher AI backend
-- Database: philosopher_ai_db
-- ================================================

-- Drop existing tables if recreating
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ================================================
-- TABLE 1: USERS
-- ================================================
-- Stores user accounts with authentication and tier info
CREATE TABLE users (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- User profile
    username VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,

    -- Subscription tier (free, student, teacher, philosopher, whitelabel)
    tier VARCHAR(50) DEFAULT 'free' NOT NULL,

    -- Consciousness tracking
    consciousness_level INTEGER DEFAULT 0,
    consciousness_history JSONB DEFAULT '[]',

    -- Usage limits
    questions_used_this_month INTEGER DEFAULT 0,
    questions_limit INTEGER DEFAULT 3, -- Free tier = 3 questions
    reset_date TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 month'),

    -- Account status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),

    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),

    -- Metadata
    signup_source VARCHAR(100), -- consciousness-gate, direct, referral, etc.
    referral_code VARCHAR(50),
    preferences JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ================================================
-- TABLE 2: QUESTIONS
-- ================================================
-- Stores all questions asked and AI responses
CREATE TABLE questions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User relationship
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Question content
    question TEXT NOT NULL,
    question_category VARCHAR(100), -- relationships, manipulation, consciousness, etc.

    -- AI response
    answer TEXT NOT NULL,
    answer_generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Pattern Theory analysis
    consciousness_boost INTEGER DEFAULT 0, -- 0-10 scale
    manipulation_score INTEGER, -- 0-100, if manipulation detected
    pattern_theory_tags TEXT[], -- ['toxic_relationships', 'ego_driven', etc.]

    -- Conversation threading
    conversation_id UUID, -- Multiple questions can share a conversation
    is_followup BOOLEAN DEFAULT false,
    parent_question_id UUID REFERENCES questions(id),

    -- Quality metrics
    user_rating INTEGER, -- 1-5 stars (optional user feedback)
    user_feedback TEXT,
    was_helpful BOOLEAN,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER, -- How long Claude took to respond
    tokens_used INTEGER, -- For cost tracking

    -- Model info
    model_used VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20241022'
);

-- Indexes for performance
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_conversation_id ON questions(conversation_id);
CREATE INDEX idx_questions_created_at ON questions(created_at);
CREATE INDEX idx_questions_category ON questions(question_category);

-- ================================================
-- TABLE 3: SUBSCRIPTIONS
-- ================================================
-- Tracks subscription history and billing events
CREATE TABLE subscriptions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User relationship
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Subscription details
    tier VARCHAR(50) NOT NULL, -- student, teacher, philosopher, whitelabel
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, past_due, unpaid

    -- Stripe integration
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Pricing
    amount_cents INTEGER NOT NULL, -- $20 = 2000 cents
    currency VARCHAR(10) DEFAULT 'usd',
    billing_interval VARCHAR(20) DEFAULT 'month', -- month or year

    -- Subscription lifecycle
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    ended_at TIMESTAMP,

    -- Trial info
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,

    -- Metadata
    cancel_reason TEXT,
    cancel_feedback TEXT,
    upgrade_history JSONB DEFAULT '[]', -- Track tier changes

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- ================================================
-- TABLE 4: USAGE_LOGS (Optional - for analytics)
-- ================================================
-- Track detailed usage for analytics
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    event_type VARCHAR(100) NOT NULL, -- 'question_asked', 'login', 'signup', 'upgrade', etc.
    event_data JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    referer TEXT
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_event_type ON usage_logs(event_type);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for subscriptions table
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to reset monthly question limits
CREATE OR REPLACE FUNCTION reset_monthly_questions()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET
        questions_used_this_month = 0,
        reset_date = CURRENT_TIMESTAMP + INTERVAL '1 month'
    WHERE reset_date <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can ask question
CREATE OR REPLACE FUNCTION can_user_ask_question(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier VARCHAR(50);
    questions_used INTEGER;
    questions_limit INTEGER;
BEGIN
    SELECT tier, questions_used_this_month, questions_limit
    INTO user_tier, questions_used, questions_limit
    FROM users
    WHERE id = user_id_param;

    -- Paid tiers have unlimited questions
    IF user_tier IN ('student', 'teacher', 'philosopher', 'whitelabel') THEN
        RETURN true;
    END IF;

    -- Free tier checks limit
    RETURN questions_used < questions_limit;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- SAMPLE DATA (for testing)
-- ================================================

-- Insert test user (password = "testpassword123" - bcrypt hashed)
INSERT INTO users (email, password_hash, username, tier, questions_limit)
VALUES (
    'test@consciousnessrevolution.io',
    '$2b$10$rG3Y8F5YLHKKOxLLwJ4h5O5Y6LHKKOxLLwJ4h5O5Y6LHKKOxLLwJ4', -- Hash for "testpassword123"
    'Test User',
    'free',
    3
);

-- Insert test paid user
INSERT INTO users (email, password_hash, username, tier, questions_limit)
VALUES (
    'paid@consciousnessrevolution.io',
    '$2b$10$rG3Y8F5YLHKKOxLLwJ4h5O5Y6LHKKOxLLwJ4h5O5Y6LHKKOxLLwJ4',
    'Paid User',
    'student',
    999999 -- Unlimited
);

-- ================================================
-- TIER CONFIGURATIONS
-- ================================================

-- Free Tier: 3 questions/month, basic responses
-- Student ($20/mo): Unlimited questions, consciousness tracking, private sessions
-- Teacher ($97/mo): Everything in Student + advanced analysis + priority support
-- Philosopher ($497/mo): Everything in Teacher + white-label option + API access
-- White-label: Custom pricing, embed Philosopher AI in their product

-- ================================================
-- ANALYTICS QUERIES
-- ================================================

-- Total users by tier
-- SELECT tier, COUNT(*) FROM users GROUP BY tier;

-- Questions asked today
-- SELECT COUNT(*) FROM questions WHERE DATE(created_at) = CURRENT_DATE;

-- Average consciousness boost
-- SELECT AVG(consciousness_boost) FROM questions WHERE consciousness_boost IS NOT NULL;

-- Revenue calculation (active subscriptions)
-- SELECT tier, COUNT(*) as count, SUM(amount_cents)/100 as total_mrr
-- FROM subscriptions
-- WHERE status = 'active'
-- GROUP BY tier;

-- User engagement (questions per user)
-- SELECT user_id, COUNT(*) as question_count
-- FROM questions
-- GROUP BY user_id
-- ORDER BY question_count DESC
-- LIMIT 10;

-- ================================================
-- MAINTENANCE
-- ================================================

-- Schedule this to run daily (via cron or pg_cron extension)
-- SELECT reset_monthly_questions();

-- Clean up old verification tokens (30 days old)
-- UPDATE users SET verification_token = NULL
-- WHERE verification_token IS NOT NULL
-- AND created_at < NOW() - INTERVAL '30 days';

-- ================================================
-- PERMISSIONS (for application user)
-- ================================================

-- CREATE USER philosopher_ai_app WITH PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE philosopher_ai_db TO philosopher_ai_app;
-- GRANT USAGE ON SCHEMA public TO philosopher_ai_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO philosopher_ai_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO philosopher_ai_app;

-- ================================================
-- BACKUP RECOMMENDATIONS
-- ================================================

-- Daily backups: pg_dump philosopher_ai_db > backup_$(date +%Y%m%d).sql
-- Replicate to secondary database for high availability
-- Store backups encrypted in S3 or equivalent

-- ================================================
-- END OF SCHEMA
-- ================================================

COMMENT ON TABLE users IS 'User accounts with authentication and subscription info';
COMMENT ON TABLE questions IS 'All questions asked and AI-generated answers with Pattern Theory analysis';
COMMENT ON TABLE subscriptions IS 'Subscription history and billing events for paid tiers';
COMMENT ON TABLE usage_logs IS 'Event logs for analytics and debugging';
