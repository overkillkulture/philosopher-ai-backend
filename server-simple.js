// ================================================
// SIMPLE SQLITE BACKEND - NO COMPLEX MIDDLEWARE
// ================================================
// Quick working server for testing
// Add security middleware later
// ================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// ================================================
// CONFIGURATION
// ================================================

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'consciousness_revolution_test_secret_2025';

// ================================================
// INITIALIZE EXPRESS APP
// ================================================

const app = express();

// Basic middleware
app.use(cors({ origin: '*', credentials: true }));
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
    `);

    console.log('✅ SQLite database initialized: consciousness.db');
}

// ================================================
// HELPER FUNCTIONS
// ================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ================================================
// AUTHENTICATION ENDPOINTS
// ================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: db ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
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
app.post('/api/auth/login', async (req, res) => {
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
app.post('/api/auth/login-pin', async (req, res) => {
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
app.get('/api/auth/me', async (req, res) => {
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
            console.log('📡 Available endpoints:');
            console.log('   GET  /api/health');
            console.log('   POST /api/auth/register');
            console.log('   POST /api/auth/login');
            console.log('   POST /api/auth/login-pin');
            console.log('   GET  /api/auth/me');
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
