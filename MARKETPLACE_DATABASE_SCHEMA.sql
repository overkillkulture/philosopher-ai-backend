-- ============================================
-- FACEBOOK MARKETPLACE CLONE - DATABASE SCHEMA
-- Complete marketplace system with all features
-- ============================================

-- Users table (integrates with existing auth system)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    bio TEXT,
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    parent_id INTEGER REFERENCES categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listings table (products for sale)
CREATE TABLE listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    condition VARCHAR(50), -- new, like-new, good, fair, poor
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Product details
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,

    -- Listing status
    status VARCHAR(50) DEFAULT 'active', -- active, sold, expired, pending, removed
    is_featured BOOLEAN DEFAULT FALSE,
    is_negotiable BOOLEAN DEFAULT TRUE,

    -- Metrics
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    sold_at TIMESTAMP,

    -- Search optimization
    search_vector TSVECTOR
);

-- Create index for full-text search
CREATE INDEX listings_search_idx ON listings USING GIN(search_vector);
CREATE INDEX listings_location_idx ON listings(latitude, longitude);
CREATE INDEX listings_user_idx ON listings(user_id);
CREATE INDEX listings_category_idx ON listings(category_id);
CREATE INDEX listings_status_idx ON listings(status);

-- Listing images
CREATE TABLE listing_images (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved listings (user favorites)
CREATE TABLE saved_listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

-- Messages between buyers and sellers
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active', -- active, archived, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, buyer_id, seller_id)
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_offer BOOLEAN DEFAULT FALSE,
    offer_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id);
CREATE INDEX messages_sender_idx ON messages(sender_id);

-- Reviews and ratings
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    transaction_type VARCHAR(50), -- buyer, seller
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, reviewer_id)
);

CREATE INDEX reviews_reviewed_user_idx ON reviews(reviewed_user_id);
CREATE INDEX reviews_listing_idx ON reviews(listing_id);

-- User statistics (cached for performance)
CREATE TABLE user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_listings INTEGER DEFAULT 0,
    active_listings INTEGER DEFAULT 0,
    sold_listings INTEGER DEFAULT 0,
    total_sales DECIMAL(12, 2) DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    response_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
    response_time INTEGER DEFAULT 0, -- minutes
    join_date TIMESTAMP,
    last_listing_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports (for moderation)
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL, -- spam, inappropriate, scam, counterfeit, etc.
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions (optional - for tracking sales)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, cancelled, disputed
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search history (for recommendations)
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT,
    category_id INTEGER REFERENCES categories(id),
    filters JSONB,
    results_count INTEGER,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX search_history_user_idx ON search_history(user_id);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- new_message, listing_sold, price_drop, new_review, etc.
    title VARCHAR(255),
    message TEXT,
    related_listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    related_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_read_idx ON notifications(is_read);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listing_search_vector_update
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_search_vector();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listings_timestamp
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA FOR CATEGORIES
-- ============================================

INSERT INTO categories (name, slug, description, display_order) VALUES
('Vehicles', 'vehicles', 'Cars, trucks, motorcycles, and more', 1),
('Electronics', 'electronics', 'Phones, computers, cameras, and gadgets', 2),
('Home & Garden', 'home-garden', 'Furniture, appliances, and home decor', 3),
('Clothing & Accessories', 'clothing-accessories', 'Fashion, shoes, and jewelry', 4),
('Sports & Outdoors', 'sports-outdoors', 'Fitness equipment, camping gear, bikes', 5),
('Toys & Games', 'toys-games', 'Kids toys, board games, video games', 6),
('Books & Media', 'books-media', 'Books, movies, music, and collectibles', 7),
('Pets', 'pets', 'Pet supplies and accessories', 8),
('Free Stuff', 'free-stuff', 'Items being given away for free', 9),
('Other', 'other', 'Miscellaneous items', 10);

-- Subcategories for Vehicles
INSERT INTO categories (name, slug, parent_id, display_order) VALUES
('Cars & Trucks', 'cars-trucks', 1, 1),
('Motorcycles', 'motorcycles', 1, 2),
('Boats', 'boats', 1, 3),
('RVs & Campers', 'rvs-campers', 1, 4),
('Auto Parts', 'auto-parts', 1, 5);

-- Subcategories for Electronics
INSERT INTO categories (name, slug, parent_id, display_order) VALUES
('Cell Phones', 'cell-phones', 2, 1),
('Computers', 'computers', 2, 2),
('TVs', 'tvs', 2, 3),
('Cameras', 'cameras', 2, 4),
('Audio', 'audio', 2, 5);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active listings with seller info
CREATE VIEW active_listings_view AS
SELECT
    l.*,
    u.username AS seller_username,
    u.full_name AS seller_name,
    u.avatar_url AS seller_avatar,
    us.average_rating AS seller_rating,
    us.total_reviews AS seller_review_count,
    c.name AS category_name,
    c.slug AS category_slug,
    (SELECT image_url FROM listing_images WHERE listing_id = l.id AND is_primary = TRUE LIMIT 1) AS primary_image,
    (SELECT COUNT(*) FROM listing_images WHERE listing_id = l.id) AS image_count
FROM listings l
JOIN users u ON l.user_id = u.id
LEFT JOIN user_stats us ON u.id = us.user_id
LEFT JOIN categories c ON l.category_id = c.id
WHERE l.status = 'active';

-- User profile with stats
CREATE VIEW user_profiles_view AS
SELECT
    u.*,
    us.total_listings,
    us.active_listings,
    us.sold_listings,
    us.average_rating,
    us.total_reviews,
    us.response_rate,
    us.response_time
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX listings_category_status_idx ON listings(category_id, status);
CREATE INDEX listings_user_status_idx ON listings(user_id, status);
CREATE INDEX listings_created_status_idx ON listings(created_at DESC, status);
CREATE INDEX listings_price_idx ON listings(price);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE listings IS 'Main table for marketplace product listings';
COMMENT ON TABLE categories IS 'Product categories with support for subcategories';
COMMENT ON TABLE conversations IS 'Chat conversations between buyers and sellers';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE reviews IS 'User reviews and ratings for transactions';
COMMENT ON TABLE user_stats IS 'Cached statistics for user profiles';
