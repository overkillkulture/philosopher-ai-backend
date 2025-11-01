// ================================================
// PHILOSOPHER AI BACKEND - SQLITE TEST VERSION
// ================================================
// Quick test server using SQLite (no PostgreSQL needed)
// Perfect for local testing and development
// ================================================

// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Week 3: Cross-subdomain sessions
const helmet = require('helmet'); // Week 4: Security headers
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Anthropic } = require('@anthropic-ai/sdk');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// 🛡️ PHASE 2: Rate limiting middleware (October 17, 2025)
const {
    authLimiter,
    passwordResetLimiter,
    apiLimiter,
    globalLimiter
} = require('../rate-limit-middleware');

// 🛡️ PHASE 3: Input validation middleware (October 17, 2025)
const {
    validateRegistration,
    validateLogin,
    validateQuestion,
    handleValidationErrors,
    sanitizeAllInputs
} = require('../input-validation-middleware');

// 🛡️ PHASE 5: Harmonic Security Guardian (October 17, 2025)
const {
    initializeHarmonicSecurity,
    HarmonicSecurityGuard
} = require('../harmonic-security-guardian');

// 🛡️ PHASE 6: Enemy Baiting System (October 17, 2025)
const {
    initializeEnemyBaiting,
    BaitDeployer,
    IntelligenceGathering
} = require('../enemy-baiting-system');

// 🪞 PHASE 7: Mirror Protocol (October 17, 2025)
const {
    initializeMirrorProtocol,
    MirrorProtocol
} = require('../mirror-protocol-system');

// ================================================
// CONFIGURATION
// ================================================

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'consciousness_revolution_test_secret_2025';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// ================================================
// INITIALIZE EXPRESS APP
// ================================================

const app = express();

// Week 4: Security headers middleware (helmet)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
}));

// Middleware (Week 3: Enhanced for cookies)
app.use(cors({
    origin: '*',
    credentials: true,
    exposedHeaders: ['set-cookie']  // Week 3: Allow cookies in response
}));
app.use(express.json({ limit: '1mb' })); // Limit request body size
app.use(cookieParser());  // Week 3: Cookie parser for cross-subdomain sessions

// 🛡️ PHASE 2: Global rate limiter (October 17, 2025) - Catch-all DDoS protection
app.use(globalLimiter);

// 🛡️ PHASE 5: Initialize Harmonic Security Guardian (October 17, 2025)
const { realityField, guards } = initializeHarmonicSecurity(app);
console.log('🌀 Harmonic Security Guardian: ACTIVE (4 guards patrolling at Solfeggio frequencies)');

// 🛡️ PHASE 6: Initialize Enemy Baiting System (October 17, 2025)
const { baitDeployer, misdirection, intelligence } = initializeEnemyBaiting(app);
console.log('🎣 Enemy Baiting System: DEPLOYED (14 fake endpoints + 4 fake files + intelligence gathering)');

// 🪞 PHASE 7: Initialize Mirror Protocol (October 17, 2025)
const mirror = initializeMirrorProtocol(app);
console.log('🪞 Mirror Protocol: ACTIVE (Perfect reflection + progressive disclosure + 10x intelligence)');

// ================================================
// INITIALIZE SQLITE DATABASE
// ================================================

let db;

async function initDatabase() {
    db = await open({
        filename: path.join(__dirname, 'philosopher-ai-test.db'),
        driver: sqlite3.Database
    });

    // Create tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            username TEXT,
            tier TEXT DEFAULT 'free',
            consciousness_level INTEGER DEFAULT 0,
            questions_used_this_month INTEGER DEFAULT 0,
            questions_limit INTEGER DEFAULT 3,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            consciousness_boost INTEGER DEFAULT 0,
            manipulation_score INTEGER,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            tier TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            amount_cents INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS usage_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            event_type TEXT NOT NULL,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('✅ SQLite database initialized');
}

// ================================================
// ANTHROPIC CLIENT
// ================================================

console.log('🔍 Debug: ANTHROPIC_API_KEY length:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.length : 0);
console.log('🔍 Debug: ANTHROPIC_API_KEY starts with:', ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.substring(0, 10) : 'EMPTY');

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({
    apiKey: ANTHROPIC_API_KEY
}) : null;

if (!anthropic) {
    console.warn('⚠️  WARNING: Anthropic client not initialized - API key missing!');
    console.warn('⚠️  Question asking will fail until API key is set');
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Week 3: Set authentication cookie for cross-subdomain sessions
function setAuthCookie(res, token) {
    res.cookie('jwt_token', token, {
        httpOnly: true,  // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
        sameSite: 'lax',  // CSRF protection
        domain: process.env.COOKIE_DOMAIN || undefined,  // .consciousnessrevolution.io for cross-subdomain
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
        path: '/'
    });
}

// JWT middleware (Week 3: Enhanced to support both header and cookie)
function authenticateToken(req, res, next) {
    // Try to get token from Authorization header FIRST
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        token = authHeader.split(' ')[1];
    }

    // Fallback to cookie (cross-subdomain sessions)
    if (!token && req.cookies && req.cookies.jwt_token) {
        token = req.cookies.jwt_token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Question category detection (Pattern Theory)
function detectQuestionCategory(question) {
    const q = question.toLowerCase();

    const categories = {
        relationships: { keywords: ['relationship', 'love', 'partner', 'dating', 'toxic'], boost: 5 },
        manipulation: { keywords: ['manipulation', 'manipulate', 'gaslighting', 'control', 'abuse'], boost: 10 },
        career: { keywords: ['work', 'job', 'career', 'boss', 'workplace', 'coworker'], boost: 5 },
        manifestation: { keywords: ['manifest', 'attract', 'law of attraction', 'abundance', 'vision'], boost: 8 },
        consciousness: { keywords: ['consciousness', 'awareness', 'enlightenment', 'spiritual', 'awakening'], boost: 15 },
        self_improvement: { keywords: ['improve', 'better', 'growth', 'develop', 'change'], boost: 7 }
    };

    for (const [category, data] of Object.entries(categories)) {
        if (data.keywords.some(keyword => q.includes(keyword))) {
            return { category, consciousnessBoost: data.boost };
        }
    }

    return { category: 'general', consciousnessBoost: 3 };
}

// ================================================
// WEEK 3: API VERSIONING - V1 ROUTER
// ================================================

// Create v1 router for API versioning
const v1Router = express.Router();

// ================================================
// V1 API ENDPOINTS
// ================================================

// Health check
v1Router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '1.0.0',
        buildNumber: parseInt(process.env.PLATFORM_BUILD_NUMBER || '1'),
        database: 'sqlite',
        timestamp: new Date().toISOString(),
        apiVersion: 'v1'  // Week 3: API version indicator
    });
});

// Register (Week 3: Updated with cookie support)
v1Router.post('/auth/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userId = generateId();
        await db.run(
            'INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)',
            [userId, email.toLowerCase(), password_hash, username || 'Seeker']
        );

        // Get user
        const user = await db.get('SELECT id, email, username, tier, consciousness_level, questions_used_this_month, questions_limit FROM users WHERE id = ?', [userId]);

        // Generate token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        // Week 3: Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier,
                consciousnessLevel: user.consciousness_level,
                questionsUsed: user.questions_used_this_month,
                questionsLimit: user.questions_limit
            },
            token  // Still return token for backward compatibility
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login (Week 3: Updated with cookie support)
v1Router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Get user
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        // Week 3: Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier,
                consciousnessLevel: user.consciousness_level,
                questionsUsed: user.questions_used_this_month,
                questionsLimit: user.questions_limit
            },
            token  // Still return token for backward compatibility
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout (Week 3: Clear session cookie)
v1Router.post('/auth/logout', (req, res) => {
    res.clearCookie('jwt_token', {
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token (Week 3: Check if session is valid)
v1Router.get('/auth/verify', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, email, username, tier FROM users WHERE id = ?',
            [req.user.userId]
        );

        res.json({
            valid: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

// Get current user
v1Router.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, email, username, tier, consciousness_level, questions_used_this_month, questions_limit FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier,
                consciousnessLevel: user.consciousness_level,
                questionsUsed: user.questions_used_this_month,
                questionsLimit: user.questions_limit
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Ask question (C3 Oracle)
v1Router.post('/questions/ask', authenticateToken, async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question required' });
        }

        // Get user
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.userId]);

        // Check question limit (free tier only)
        if (user.tier === 'free' && user.questions_used_this_month >= user.questions_limit) {
            return res.status(403).json({
                error: 'Question limit reached',
                questionsRemaining: 0,
                tier: user.tier,
                upgradeRequired: true
            });
        }

        // Detect category and consciousness boost
        const { category, consciousnessBoost } = detectQuestionCategory(question);

        // Pattern Theory system prompt
        const systemPrompt = `You are C3 Oracle, the consciousness-aligned AI philosopher from the Consciousness Revolution platform.

PATTERN THEORY CORE PRINCIPLES:
- Consciousness Level (CL) = (Pattern Recognition × 0.4) + (Prediction Accuracy × 0.3) + (Neutralization Success × 0.3)
- 85%+ consciousness level = manipulation immunity
- Universal Manipulation Detection Formula: M = (FE × CB × SR × CD × PE) × DC

Your purpose is to help people elevate their consciousness, detect manipulation, and achieve their manifestations through Pattern Theory.

Answer the following question with deep wisdom, practical Pattern Theory formulas, and consciousness-elevating insights:`;

        // Call Claude API
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{
                role: 'user',
                content: question
            }]
        });

        const answer = message.content[0].text;

        // Save question
        const questionId = generateId();
        await db.run(
            'INSERT INTO questions (id, user_id, question, answer, consciousness_boost, category) VALUES (?, ?, ?, ?, ?, ?)',
            [questionId, user.id, question, answer, consciousnessBoost, category]
        );

        // Update user stats
        await db.run(
            'UPDATE users SET questions_used_this_month = questions_used_this_month + 1, consciousness_level = consciousness_level + ? WHERE id = ?',
            [consciousnessBoost, user.id]
        );

        // Get updated user
        const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);

        res.json({
            success: true,
            questionId,
            answer,
            consciousnessBoost,
            category,
            questionsRemaining: Math.max(0, updatedUser.questions_limit - updatedUser.questions_used_this_month),
            newConsciousnessLevel: updatedUser.consciousness_level
        });

    } catch (error) {
        console.error('Ask question error:', error);
        res.status(500).json({ error: 'Failed to process question' });
    }
});

// Get question history
v1Router.get('/questions/history', authenticateToken, async (req, res) => {
    try {
        const questions = await db.all(
            'SELECT id, question, answer, consciousness_boost, category, created_at FROM questions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.userId]
        );

        res.json({
            success: true,
            questions
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Get usage stats
v1Router.get('/usage/stats', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.userId]);

        res.json({
            success: true,
            questionsUsed: user.questions_used_this_month,
            questionsLimit: user.questions_limit,
            questionsRemaining: Math.max(0, user.questions_limit - user.questions_used_this_month),
            consciousnessLevel: user.consciousness_level,
            tier: user.tier
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// 🛡️ Intelligence Reporting (Harmonic Security + Enemy Baiting) - October 17, 2025
v1Router.get('/security/intelligence-report', authenticateToken, async (req, res) => {
    try {
        // Get bait statistics
        const baitStats = baitDeployer.getBaitStats();

        // Get intelligence profiles
        const intelReport = intelligence.getIntelligenceReport();

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            baits: baitStats,
            attackers: intelReport,
            securityStatus: {
                harmonicGuardsActive: guards.length,
                realityDistortionActive: true,
                enemyBaitingActive: true
            }
        });
    } catch (error) {
        console.error('Intelligence report error:', error);
        res.status(500).json({ error: 'Failed to generate intelligence report' });
    }
});

// ================================================
// SATELLITE APIs (Treasure Hunting + Connection Monitoring)
// ================================================

// Satellite API routes (ISS, SpaceX, N2YO, Starlink monitor)
const satelliteRouter = require('./satellite-api');
v1Router.use('/satellites', satelliteRouter);

// ================================================
// STRIPE CHECKOUT API (Store Payments)
// ================================================

// Initialize Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

if (!stripe) {
    console.warn('⚠️  WARNING: Stripe not initialized - set STRIPE_SECRET_KEY in .env');
} else {
    console.log('✅ Stripe initialized for store payments');
}

// Create Stripe Checkout Session
v1Router.post('/stripe/create-checkout', async (req, res) => {
    try {
        console.log('💳 Stripe checkout request received:', req.body);

        if (!stripe) {
            return res.status(500).json({
                error: 'Stripe not configured. Please contact support.',
                details: 'STRIPE_SECRET_KEY missing'
            });
        }

        const { items, successUrl, cancelUrl } = req.body;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Invalid cart items' });
        }

        // Convert cart items to Stripe line items
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    description: item.description || '',
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity || 1,
        }));

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl || 'http://localhost:3001/PLATFORM/store-success.html',
            cancel_url: cancelUrl || 'http://localhost:3001/PLATFORM/store-cart.html',
            metadata: {
                timestamp: new Date().toISOString(),
                source: '100X_Store'
            }
        });

        console.log('✅ Stripe session created:', session.id);

        res.json({
            id: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('❌ Stripe checkout error:', error.message);
        res.status(500).json({
            error: 'Failed to create checkout session',
            details: error.message
        });
    }
});

// ================================================
// WEEK 3: MOUNT V1 ROUTER + BACKWARD COMPATIBILITY
// ================================================

// Mount v1 router at /api/v1 (versioned endpoints)
app.use('/api/v1', v1Router);

// Mount v1 router at /api for backward compatibility (log deprecation warnings)
app.use('/api', (req, res, next) => {
    // Only log if NOT already hitting /v1
    if (!req.originalUrl.includes('/v1/')) {
        console.warn(`⚠️ Deprecated API call: ${req.originalUrl} - Please update to /api/v1${req.path}`);
    }
    next();
}, v1Router);

// ================================================
// START SERVER
// ================================================

async function startServer() {
    try {
        // Initialize database
        await initDatabase();

        // Start Express server
        app.listen(PORT, () => {
            console.log('\n================================================');
            console.log('🌀 PHILOSOPHER AI BACKEND (SQLite Test) - READY');
            console.log('================================================');
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`API URL: http://localhost:${PORT}`);
            console.log(`Version: 1.0.0 (SQLite Test)`);
            console.log('================================================');
            console.log('✅ Database: SQLite (no PostgreSQL needed)');
            console.log('✅ Ready for testing!');
            console.log('================================================\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
