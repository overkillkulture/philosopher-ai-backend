// ================================================
// SIMPLE SQLITE BACKEND - NO COMPLEX MIDDLEWARE
// ================================================
// Quick working server for testing
// Add security middleware later
// ================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const stripeService = require('./services/stripeService');
const emailService = require('./services/emailService');

// ================================================
// CONFIGURATION
// ================================================

const PORT = process.env.PORT || 3001;

// CRITICAL SECURITY: JWT_SECRET must be set in environment
// Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
if (!process.env.JWT_SECRET) {
    console.error('');
    console.error('❌ FATAL ERROR: JWT_SECRET environment variable is not set!');
    console.error('');
    console.error('For security, JWT_SECRET must be explicitly configured.');
    console.error('Add JWT_SECRET to your .env file or environment variables.');
    console.error('');
    console.error('Generate a secure secret with:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('');
    process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET.length < 32) {
    console.error('');
    console.error('❌ FATAL ERROR: JWT_SECRET is too weak!');
    console.error('');
    console.error(`Current length: ${process.env.JWT_SECRET.length} characters`);
    console.error('Required: At least 32 characters (64+ recommended)');
    console.error('');
    console.error('Generate a secure secret with:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('');
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

// ================================================
// INITIALIZE EXPRESS APP
// ================================================

const app = express();

// CORS configuration for cross-subdomain sessions
const corsOptions = {
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow consciousnessrevolution.io and all subdomains
        if (origin.endsWith('.consciousnessrevolution.io') || origin === 'https://consciousnessrevolution.io') {
            return callback(null, true);
        }

        // Allow Railway domains
        if (origin.includes('.railway.app')) {
            return callback(null, true);
        }

        // Reject other origins
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Allow cookies
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// ================================================
// INITIALIZE SQLITE DATABASE
// ================================================

let db;

async function initDatabase() {
    db = await open({
        filename: path.join(__dirname, 'consciousness.db'),
        driver: sqlite3.Database
    });

    // Create users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT,
            pin TEXT UNIQUE,
            permissions TEXT DEFAULT '{}',
            consciousness_level INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS error_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            error_message TEXT NOT NULL,
            error_stack TEXT,
            page_url TEXT,
            user_agent TEXT,
            severity TEXT DEFAULT 'error',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('✅ SQLite database initialized: consciousness.db');
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Set authentication cookie for cross-subdomain sessions
 *
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
function setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? '.consciousnessrevolution.io' : undefined;

    res.cookie('auth_token', token, {
        httpOnly: true,        // Prevent XSS attacks
        secure: isProduction,  // HTTPS only in production
        sameSite: isProduction ? 'none' : 'lax', // Cross-site in production
        domain: domain,        // Cross-subdomain access
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
}

// ================================================
// AUTHENTICATION ENDPOINTS - V1 API
// ================================================

// Health check (non-versioned for convenience)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: 'v1',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// V1 Health check
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: 'v1',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Register new user
app.post('/api/v1/auth/register', async (req, res) => {
    try {
        const { email, password, name, pin } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userId = generateId();
        await db.run(
            `INSERT INTO users (id, email, password_hash, name, pin, permissions)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, email, password_hash, name || 'User', pin || null, JSON.stringify({})]
        );

        // Generate JWT
        const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        // Send welcome email (async, don't wait)
        emailService.sendWelcomeEmail(email, name || 'there').catch(error => {
            console.error('Failed to send welcome email:', error);
            // Don't fail registration if email fails
        });

        res.status(201).json({
            success: true,
            user: { id: userId, email, name: name || 'User' },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login with email/password
app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                permissions: JSON.parse(user.permissions || '{}')
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Login with PIN (for simple 4-digit PIN authentication)
app.post('/api/v1/auth/login-pin', async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin || pin.length !== 4) {
            return res.status(400).json({ error: '4-digit PIN required' });
        }

        // Find user by PIN
        const user = await db.get('SELECT * FROM users WHERE pin = ?', [pin]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Generate JWT
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie for cross-subdomain sessions
        setAuthCookie(res, token);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                pin: user.pin,
                permissions: JSON.parse(user.permissions || '{}')
            },
            token
        });

    } catch (error) {
        console.error('PIN login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user (requires JWT)
app.get('/api/v1/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                permissions: JSON.parse(user.permissions || '{}')
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ================================================
// ERROR LOGGING ENDPOINTS
// ================================================

// Log client-side error
app.post('/api/v1/errors/log', async (req, res) => {
    try {
        const { message, stack, url, userAgent, severity = 'error' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Error message required' });
        }

        // Get user ID from JWT if available
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.userId;
            } catch (e) {
                // Invalid token, but still log the error
            }
        }

        // Create error log
        const errorId = generateId();
        await db.run(
            `INSERT INTO error_logs (id, user_id, error_message, error_stack, page_url, user_agent, severity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [errorId, userId, message, stack || null, url || null, userAgent || null, severity]
        );

        res.json({ success: true, id: errorId });

    } catch (error) {
        console.error('Error logging failed:', error);
        res.status(500).json({ error: 'Failed to log error' });
    }
});

// Get recent errors
app.get('/api/v1/errors/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const severity = req.query.severity || null;

        let query = 'SELECT * FROM error_logs';
        const params = [];

        if (severity) {
            query += ' WHERE severity = ?';
            params.push(severity);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const errors = await db.all(query, params);

        res.json({ success: true, errors, count: errors.length });

    } catch (error) {
        console.error('Error retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve errors' });
    }
});

// Get error stats
app.get('/api/v1/errors/stats', async (req, res) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [totalCount, last24hCount, bySeverity] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM error_logs'),
            db.get('SELECT COUNT(*) as count FROM error_logs WHERE created_at > ?', [last24h]),
            db.all('SELECT severity, COUNT(*) as count FROM error_logs GROUP BY severity')
        ]);

        res.json({
            success: true,
            total: totalCount.count,
            last24h: last24hCount.count,
            bySeverity: bySeverity.reduce((acc, row) => {
                acc[row.severity] = row.count;
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('Error stats failed:', error);
        res.status(500).json({ error: 'Failed to get error stats' });
    }
});

// ================================================
// STRIPE PAYMENT ROUTES
// ================================================

// Create checkout session (start subscription)
app.post('/api/v1/stripe/create-checkout', authenticateToken, async (req, res) => {
    try {
        const { tier } = req.body;
        const userId = req.user.id;

        if (!tier || !['pro', 'enterprise'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier. Must be "pro" or "enterprise"' });
        }

        // Get user email from database
        const user = await db.get('SELECT email FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create checkout session
        const session = await stripeService.createCheckoutSession({
            userId: userId,
            userEmail: user.email,
            tier: tier,
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=success`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?payment=canceled`
        });

        res.json({
            success: true,
            sessionId: session.sessionId,
            url: session.url
        });

    } catch (error) {
        console.error('Checkout session creation failed:', error);
        res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
    }
});

// Create customer portal session (manage subscription)
app.post('/api/v1/stripe/create-portal', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's Stripe customer ID
        const user = await db.get('SELECT stripe_customer_id FROM users WHERE id = ?', [userId]);
        if (!user || !user.stripe_customer_id) {
            return res.status(404).json({ error: 'No Stripe customer found' });
        }

        // Create portal session
        const session = await stripeService.createCustomerPortalSession(
            user.stripe_customer_id,
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
        );

        res.json({
            success: true,
            url: session.url
        });

    } catch (error) {
        console.error('Portal session creation failed:', error);
        res.status(500).json({ error: 'Failed to create portal session', details: error.message });
    }
});

// Get subscription status
app.get('/api/v1/stripe/subscription', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user subscription info
        const user = await db.get(
            'SELECT subscription_tier, subscription_status, stripe_subscription_id, stripe_customer_id FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get tier features
        const features = stripeService.getTierFeatures(user.subscription_tier || 'free');

        // Get usage this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const usageResult = await db.get(
            'SELECT COUNT(*) as count FROM questions WHERE user_id = ? AND created_at >= ?',
            [userId, startOfMonth.toISOString()]
        );

        const currentUsage = usageResult ? usageResult.count : 0;

        // Check if more requests allowed
        const usageCheck = stripeService.checkUsageLimit(user, currentUsage);

        res.json({
            success: true,
            subscription: {
                tier: user.subscription_tier || 'free',
                status: user.subscription_status || 'active',
                stripeCustomerId: user.stripe_customer_id,
                stripeSubscriptionId: user.stripe_subscription_id,
                features: features,
                usage: {
                    current: currentUsage,
                    limit: usageCheck.limit,
                    remaining: usageCheck.remaining,
                    allowed: usageCheck.allowed
                }
            }
        });

    } catch (error) {
        console.error('Subscription status retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve subscription status' });
    }
});

// Stripe webhook handler
app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];

        // Handle webhook with callbacks
        await stripeService.handleWebhook(
            req.body,
            signature,
            {
                // Subscription created
                onSubscriptionCreated: async (subscription) => {
                    console.log('📧 Subscription created:', subscription.id);

                    const userId = subscription.metadata.userId;
                    const tier = subscription.metadata.tier || 'pro';

                    await db.run(
                        `UPDATE users
                         SET subscription_tier = ?,
                             subscription_status = ?,
                             stripe_subscription_id = ?,
                             stripe_customer_id = ?
                         WHERE id = ?`,
                        [tier, subscription.status, subscription.id, subscription.customer, userId]
                    );

                    console.log(`✅ User ${userId} upgraded to ${tier}`);

                    // Send subscription upgraded email
                    try {
                        const user = await db.get('SELECT email, name FROM users WHERE id = ?', [userId]);
                        if (user) {
                            const nextBillingDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
                            const amount = tier === 'pro' ? 29 : 500;

                            await emailService.sendSubscriptionUpgradedEmail(
                                user.email,
                                user.name || 'there',
                                {
                                    planName: tier === 'pro' ? 'Pro' : 'Enterprise',
                                    newAmount: amount,
                                    nextBillingDate: nextBillingDate
                                }
                            );

                            console.log(`✅ Subscription upgraded email sent to ${user.email}`);
                        }
                    } catch (error) {
                        console.error('Failed to send subscription upgraded email:', error);
                    }
                },

                // Subscription updated
                onSubscriptionUpdated: async (subscription) => {
                    console.log('🔄 Subscription updated:', subscription.id);

                    const userId = subscription.metadata.userId;
                    const tier = subscription.metadata.tier || 'pro';

                    await db.run(
                        `UPDATE users
                         SET subscription_tier = ?,
                             subscription_status = ?
                         WHERE stripe_subscription_id = ?`,
                        [tier, subscription.status, subscription.id]
                    );

                    console.log(`✅ Subscription ${subscription.id} updated to status: ${subscription.status}`);
                },

                // Subscription deleted
                onSubscriptionDeleted: async (subscription) => {
                    console.log('❌ Subscription deleted:', subscription.id);

                    await db.run(
                        `UPDATE users
                         SET subscription_tier = 'free',
                             subscription_status = 'canceled'
                         WHERE stripe_subscription_id = ?`,
                        [subscription.id]
                    );

                    console.log(`✅ Subscription ${subscription.id} canceled, user downgraded to free`);

                    // Send subscription canceled email
                    try {
                        const user = await db.get(
                            'SELECT email, name FROM users WHERE stripe_subscription_id = ?',
                            [subscription.id]
                        );

                        if (user) {
                            const expirationDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
                            const tier = subscription.metadata.tier || 'Pro';

                            await emailService.sendSubscriptionCanceledEmail(
                                user.email,
                                user.name || 'there',
                                {
                                    planName: tier === 'pro' ? 'Pro' : 'Enterprise',
                                    expirationDate: expirationDate
                                }
                            );

                            console.log(`✅ Subscription canceled email sent to ${user.email}`);
                        }
                    } catch (error) {
                        console.error('Failed to send subscription canceled email:', error);
                    }
                },

                // Payment succeeded
                onPaymentSucceeded: async (invoice) => {
                    console.log('💰 Payment succeeded:', invoice.id);

                    // Get user info and send payment confirmation email
                    try {
                        const subscriptionId = invoice.subscription;
                        if (subscriptionId) {
                            const user = await db.get(
                                'SELECT id, email, name, subscription_tier FROM users WHERE stripe_subscription_id = ?',
                                [subscriptionId]
                            );

                            if (user) {
                                const nextBillingDate = new Date(invoice.period_end * 1000).toLocaleDateString();
                                const paymentDate = new Date(invoice.created * 1000).toLocaleDateString();

                                await emailService.sendPaymentConfirmationEmail(
                                    user.email,
                                    user.name || 'there',
                                    {
                                        planName: user.subscription_tier === 'pro' ? 'Pro' : 'Enterprise',
                                        amount: (invoice.amount_paid / 100).toFixed(2),
                                        last4: invoice.charge?.payment_method_details?.card?.last4 || '****',
                                        nextBillingDate: nextBillingDate,
                                        invoiceId: invoice.id,
                                        paymentDate: paymentDate
                                    }
                                );

                                console.log(`✅ Payment confirmation email sent to ${user.email}`);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to send payment confirmation email:', error);
                    }
                },

                // Payment failed
                onPaymentFailed: async (invoice) => {
                    console.log('⚠️ Payment failed:', invoice.id);
                    // Could send payment failure email, suspend account, etc.
                },

                // Checkout completed
                onCheckoutCompleted: async (session) => {
                    console.log('✅ Checkout completed:', session.id);
                    const userId = session.metadata.userId;

                    // Update user with customer ID if not already set
                    await db.run(
                        `UPDATE users
                         SET stripe_customer_id = ?
                         WHERE id = ? AND stripe_customer_id IS NULL`,
                        [session.customer, userId]
                    );
                }
            }
        );

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook handling failed:', error);
        res.status(400).json({ error: 'Webhook handling failed', details: error.message });
    }
});

// ================================================
// ADMIN ENDPOINTS (Requires admin permissions)
// ================================================

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    // First authenticate as regular user
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Check if user has admin permissions
        db.get('SELECT permissions FROM users WHERE id = ?', [decoded.userId])
            .then(user => {
                if (!user) {
                    return res.status(401).json({ error: 'User not found' });
                }

                const permissions = JSON.parse(user.permissions || '{}');
                if (!permissions.admin && !permissions.superadmin) {
                    return res.status(403).json({ error: 'Admin access required' });
                }

                req.userPermissions = permissions;
                next();
            })
            .catch(error => {
                console.error('Permission check failed:', error);
                res.status(500).json({ error: 'Permission check failed' });
            });

    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Get all users (paginated)
app.get('/api/v1/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `
            SELECT id, email, name, subscription_tier, subscription_status,
                   created_at, last_login, permissions,
                   stripe_customer_id, stripe_subscription_id
            FROM users
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        const params = [];
        const countParams = [];

        if (search) {
            query += ' WHERE email LIKE ? OR name LIKE ?';
            countQuery += ' WHERE email LIKE ? OR name LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
            countParams.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [users, countResult] = await Promise.all([
            db.all(query, params),
            db.get(countQuery, countParams)
        ]);

        res.json({
            success: true,
            users: users.map(u => ({
                ...u,
                permissions: JSON.parse(u.permissions || '{}')
            })),
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        });

    } catch (error) {
        console.error('Admin users list failed:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

// Get single user details
app.get('/api/v1/admin/users/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await db.get(
            `SELECT id, email, name, subscription_tier, subscription_status,
                    created_at, last_login, permissions,
                    stripe_customer_id, stripe_subscription_id
             FROM users WHERE id = ?`,
            [userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's question count
        const questionsResult = await db.get(
            'SELECT COUNT(*) as count FROM questions WHERE user_id = ?',
            [userId]
        );

        // Get usage this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyUsage = await db.get(
            'SELECT COUNT(*) as count FROM questions WHERE user_id = ? AND created_at >= ?',
            [userId, startOfMonth.toISOString()]
        );

        res.json({
            success: true,
            user: {
                ...user,
                permissions: JSON.parse(user.permissions || '{}'),
                stats: {
                    totalQuestions: questionsResult.count,
                    monthlyQuestions: monthlyUsage.count
                }
            }
        });

    } catch (error) {
        console.error('Admin user details failed:', error);
        res.status(500).json({ error: 'Failed to retrieve user details' });
    }
});

// Update user (permissions, subscription, etc.)
app.patch('/api/v1/admin/users/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions, subscription_tier, subscription_status, name } = req.body;

        const updates = [];
        const params = [];

        if (permissions) {
            updates.push('permissions = ?');
            params.push(JSON.stringify(permissions));
        }

        if (subscription_tier) {
            updates.push('subscription_tier = ?');
            params.push(subscription_tier);
        }

        if (subscription_status) {
            updates.push('subscription_status = ?');
            params.push(subscription_status);
        }

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(userId);

        await db.run(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        console.error('Admin user update failed:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (soft delete)
app.delete('/api/v1/admin/users/:userId', authenticateAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent self-deletion
        if (userId === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await db.run(
            `UPDATE users SET
             subscription_tier = 'free',
             subscription_status = 'deleted',
             permissions = '{"deleted": true}'
             WHERE id = ?`,
            [userId]
        );

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Admin user deletion failed:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get usage analytics
app.get('/api/v1/admin/analytics/usage', authenticateAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [totalUsers, usersByTier, activeUsers, questionsByDay, totalQuestions, monthlyQuestions, topUsers] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM users'),
            db.all('SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier'),
            db.get('SELECT COUNT(*) as count FROM users WHERE last_login >= ?', [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()]),
            db.all('SELECT DATE(created_at) as date, COUNT(*) as count FROM questions WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date DESC', [startDate.toISOString()]),
            db.get('SELECT COUNT(*) as count FROM questions'),
            db.get('SELECT COUNT(*) as count FROM questions WHERE created_at >= ?', [new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()]),
            db.all(`SELECT u.id, u.email, u.name, COUNT(q.id) as question_count FROM users u LEFT JOIN questions q ON u.id = q.user_id WHERE q.created_at >= ? GROUP BY u.id ORDER BY question_count DESC LIMIT 10`, [startDate.toISOString()])
        ]);

        res.json({
            success: true,
            analytics: {
                users: {
                    total: totalUsers.count,
                    active: activeUsers.count,
                    byTier: usersByTier.reduce((acc, row) => {
                        acc[row.subscription_tier || 'free'] = row.count;
                        return acc;
                    }, {})
                },
                questions: {
                    total: totalQuestions.count,
                    thisMonth: monthlyQuestions.count,
                    byDay: questionsByDay
                },
                topUsers: topUsers
            }
        });

    } catch (error) {
        console.error('Admin analytics failed:', error);
        res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
});

// Get subscription analytics
app.get('/api/v1/admin/analytics/subscriptions', authenticateAdmin, async (req, res) => {
    try {
        const activeSubscriptions = await db.all(
            `SELECT subscription_tier, COUNT(*) as count
             FROM users
             WHERE subscription_status = 'active' AND subscription_tier != 'free'
             GROUP BY subscription_tier`
        );

        let totalMRR = 0;
        const revenueByTier = {};

        activeSubscriptions.forEach(row => {
            const amount = row.subscription_tier === 'pro' ? 29 : 500;
            const revenue = amount * row.count;
            totalMRR += revenue;
            revenueByTier[row.subscription_tier] = { count: row.count, mrr: revenue };
        });

        const statusBreakdown = await db.all(
            `SELECT subscription_status, COUNT(*) as count FROM users WHERE subscription_tier != 'free' GROUP BY subscription_status`
        );

        const recentSubscriptions = await db.all(
            `SELECT u.id, u.email, u.name, u.subscription_tier, u.created_at FROM users u WHERE u.subscription_tier != 'free' AND u.created_at >= ? ORDER BY u.created_at DESC LIMIT 20`,
            [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]
        );

        res.json({
            success: true,
            analytics: {
                revenue: {
                    totalMRR: totalMRR,
                    annualRunRate: totalMRR * 12,
                    byTier: revenueByTier
                },
                subscriptions: {
                    active: activeSubscriptions.reduce((sum, row) => sum + row.count, 0),
                    statusBreakdown: statusBreakdown.reduce((acc, row) => {
                        acc[row.subscription_status] = row.count;
                        return acc;
                    }, {})
                },
                recent: recentSubscriptions
            }
        });

    } catch (error) {
        console.error('Admin subscription analytics failed:', error);
        res.status(500).json({ error: 'Failed to retrieve subscription analytics' });
    }
});

// Get system health
app.get('/api/v1/admin/system/health', authenticateAdmin, async (req, res) => {
    try {
        const dbTest = await db.get('SELECT 1 as test');
        const databaseHealthy = dbTest?.test === 1;

        const dbStats = await db.get(`
            SELECT
                (SELECT COUNT(*) FROM users) as user_count,
                (SELECT COUNT(*) FROM questions) as question_count,
                (SELECT COUNT(*) FROM error_logs) as error_count
        `);

        const memoryUsage = process.memoryUsage();

        res.json({
            success: true,
            health: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: {
                        status: databaseHealthy ? 'operational' : 'down',
                        stats: dbStats
                    },
                    stripe: {
                        status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
                    },
                    sendgrid: {
                        status: process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured'
                    }
                },
                system: {
                    uptime: Math.floor(process.uptime()),
                    memory: {
                        rss: Math.floor(memoryUsage.rss / 1024 / 1024) + ' MB',
                        heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                        heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
                    },
                    nodeVersion: process.version,
                    platform: process.platform
                }
            }
        });

    } catch (error) {
        console.error('Admin health check failed:', error);
        res.status(500).json({
            success: false,
            health: {
                status: 'unhealthy',
                error: error.message
            }
        });
    }
});

// ================================================
// START SERVER
// ================================================

async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
            console.log('🌀 CONSCIOUSNESS BACKEND - SIMPLE VERSION');
            console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
            console.log('');
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log('✅ SQLite database ready');
            console.log('✅ CORS enabled (all origins)');
            console.log('');
            console.log('📡 Available endpoints (v1):');
            console.log('   GET  /api/health');
            console.log('   GET  /api/v1/health');
            console.log('   POST /api/v1/auth/register');
            console.log('   POST /api/v1/auth/login');
            console.log('   POST /api/v1/auth/login-pin');
            console.log('   GET  /api/v1/auth/me');
            console.log('   POST /api/v1/stripe/create-checkout');
            console.log('   POST /api/v1/stripe/create-portal');
            console.log('   GET  /api/v1/stripe/subscription');
            console.log('   POST /api/v1/stripe/webhook');
            console.log('');
            console.log('🔥 Ready for connections!');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
