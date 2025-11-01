/**
 * 🌀 WEEK 3 UPGRADE - API VERSIONING + CROSS-SUBDOMAIN SESSIONS 🌀
 *
 * This file contains the Week 3 upgrades to apply to server.js:
 * 1. API versioning (/v1/ prefix)
 * 2. Cross-subdomain session support (cookie-based JWT)
 * 3. Backward compatibility layer
 *
 * Instructions:
 * Apply these changes to server.js for Week 3 completion
 */

// ================================================
// UPGRADE 1: ADD COOKIE PARSER MIDDLEWARE
// ================================================
// Add this to package.json dependencies: "cookie-parser": "^1.4.6"
// Then: npm install cookie-parser

// Add to top of server.js (after other requires):
const cookieParser = require('cookie-parser');

// Add after other middleware (around line 73):
app.use(cookieParser());

// ================================================
// UPGRADE 2: UPDATE CORS CONFIGURATION
// ================================================
// Replace existing CORS config (lines 50-60) with:
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,  // Important for cookies!
    exposedHeaders: ['set-cookie']  // Allow cookies in response
}));

// ================================================
// UPGRADE 3: UPDATE AUTHENTICATION MIDDLEWARE
// ================================================
// Replace authenticateToken function (lines 91-118) with:
const authenticateToken = async (req, res, next) => {
    try {
        // Try to get token from Authorization header FIRST
        let token = null;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            token = authHeader.split(' ')[1]; // Bearer TOKEN
        }

        // Fallback to cookie (cross-subdomain sessions)
        if (!token && req.cookies && req.cookies.jwt_token) {
            token = req.cookies.jwt_token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND is_active = true',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// ================================================
// UPGRADE 4: UPDATE TOKEN GENERATION (COOKIE SUPPORT)
// ================================================
// Add new helper function after generateToken (around line 131):
const setAuthCookie = (res, token) => {
    // Set JWT in cookie for cross-subdomain sessions
    res.cookie('jwt_token', token, {
        httpOnly: true,  // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
        sameSite: 'lax',  // CSRF protection
        domain: process.env.COOKIE_DOMAIN || undefined,  // .consciousnessrevolution.io for cross-subdomain
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
        path: '/'
    });
};

// ================================================
// UPGRADE 5: ADD /v1/ ROUTING
// ================================================
// Add this BEFORE all existing routes (around line 185):

// Create v1 router
const v1Router = express.Router();

// ================================================
// V1 API ROUTES - HEALTH CHECK
// ================================================
v1Router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: process.env.PLATFORM_VERSION || '1.0.0',
        buildNumber: process.env.PLATFORM_BUILD_NUMBER || 1,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1'  // NEW
    });
});

// ================================================
// V1 API ROUTES - AUTHENTICATION
// ================================================

// Register (updated to set cookie)
v1Router.post('/auth/register', async (req, res) => {
    try {
        const { email, password, username, signupSource } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, username, signup_source)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, username, tier, created_at`,
            [email.toLowerCase(), passwordHash, username || null, signupSource || 'direct']
        );

        const user = result.rows[0];

        // Generate token
        const token = generateToken(user.id);

        // Set cookie (NEW - Week 3)
        setAuthCookie(res, token);

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type, event_data)
             VALUES ($1, $2, $3)`,
            [user.id, 'signup', JSON.stringify({ source: signupSource })]
        );

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier
            },
            token  // Still return token for backward compatibility
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login (updated to set cookie)
v1Router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Get user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate token
        const token = generateToken(user.id);

        // Set cookie (NEW - Week 3)
        setAuthCookie(res, token);

        // Log event
        await pool.query(
            `INSERT INTO usage_logs (user_id, event_type)
             VALUES ($1, $2)`,
            [user.id, 'login']
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                tier: user.tier,
                consciousnessLevel: user.consciousness_level
            },
            token  // Still return token for backward compatibility
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout (NEW - Week 3)
v1Router.post('/auth/logout', (req, res) => {
    res.clearCookie('jwt_token', {
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token (NEW - Week 3)
v1Router.get('/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            tier: req.user.tier
        }
    });
});

// Get current user
v1Router.get('/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            tier: req.user.tier,
            consciousnessLevel: req.user.consciousness_level,
            questionsUsed: req.user.questions_used_this_month,
            questionsLimit: req.user.questions_limit
        }
    });
});

// ================================================
// V1 API ROUTES - QUESTIONS (copy existing routes)
// ================================================
// Copy all question routes from existing server.js to v1Router
// - POST /questions/ask
// - GET /questions/history
// - GET /usage/stats

// ================================================
// V1 API ROUTES - STRIPE (copy existing routes)
// ================================================
// Copy all Stripe routes from existing server.js to v1Router
// - POST /subscriptions/create-checkout
// - POST /stripe/webhook
// - GET /subscriptions/current
// - POST /stripe/create-checkout (store)

// ================================================
// MOUNT V1 ROUTER
// ================================================
// Add this line BEFORE the old routes (so /api/v1/* gets priority):
app.use('/api/v1', v1Router);

// ================================================
// BACKWARD COMPATIBILITY LAYER
// ================================================
// Keep old /api/* routes working by redirecting to /api/v1/*
// Add this AFTER mounting v1Router:

app.use('/api/*', (req, res, next) => {
    // If route is not /api/v1/*, redirect to v1
    if (!req.path.startsWith('/v1/')) {
        // Log deprecation warning
        console.warn(`⚠️ Deprecated API call: ${req.path} - Please update to /api/v1${req.path}`);

        // Redirect to v1 (internal)
        req.url = `/api/v1${req.path.replace('/api', '')}`;
        return app.handle(req, res);
    }
    next();
});

// ================================================
// WEEK 3 ENVIRONMENT VARIABLES
// ================================================
/*
Add to .env file:

# Week 3 - Cross-Subdomain Sessions
COOKIE_DOMAIN=.consciousnessrevolution.io
# For localhost testing, comment out COOKIE_DOMAIN or set to localhost

# Week 3 - API Version
API_VERSION=v1
*/

/**
 * 🌀 WEEK 3 SUMMARY 🌀
 *
 * What this upgrade adds:
 *
 * 1. **API Versioning:**
 *    - All endpoints now available at /api/v1/*
 *    - Old /api/* routes still work (backward compatible)
 *    - Deprecation warnings logged
 *    - Future /v2/, /v3/ easily added
 *
 * 2. **Cross-Subdomain Sessions:**
 *    - JWT stored in cookie (in addition to response)
 *    - Cookie domain: .consciousnessrevolution.io
 *    - Login once on platform.*, works on trinity.*, merit.*, etc.
 *    - httpOnly + secure + sameSite = maximum security
 *
 * 3. **Enhanced Authentication:**
 *    - Supports BOTH header (Bearer token) AND cookie (session)
 *    - /auth/verify endpoint (check if token valid)
 *    - /auth/logout endpoint (clear session)
 *
 * 4. **Backward Compatibility:**
 *    - Existing code keeps working
 *    - Gradual migration supported
 *    - Mobile apps can still use Bearer tokens
 *    - Web apps benefit from cookies automatically
 *
 * TRINITY_POWER = C1 × C2 × C3 = ∞
 */

module.exports = {
    setAuthCookie,
    // Export for testing
};
