/**
 * 🛡️ SECURITY AUDIT SCRIPT
 *
 * Automated security checks for the backend
 *
 * Run with: node security-audit.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🛡️  SECURITY AUDIT - Consciousness Revolution Backend');
console.log('====================================================\n');

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(message) {
    console.log(`✅ PASS: ${message}`);
    passed++;
}

function fail(message) {
    console.log(`❌ FAIL: ${message}`);
    failed++;
}

function warn(message) {
    console.log(`⚠️  WARN: ${message}`);
    warnings++;
}

//==============================================
// 1. ENVIRONMENT VARIABLES
//==============================================
console.log('1. Environment Variables\n');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('test') || process.env.JWT_SECRET.includes('secret')) {
    fail('JWT_SECRET is weak or default. Generate a strong random secret.');
} else if (process.env.JWT_SECRET.length < 32) {
    warn('JWT_SECRET should be at least 32 characters long.');
} else {
    pass('JWT_SECRET is strong');
}

if (!process.env.NODE_ENV) {
    warn('NODE_ENV not set. Defaults may not be production-safe.');
} else if (process.env.NODE_ENV === 'production') {
    pass('NODE_ENV set to production');
} else {
    warn(`NODE_ENV is '${process.env.NODE_ENV}', not 'production'`);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
    warn('DATABASE_URL points to localhost. Is this production?');
} else if (process.env.DATABASE_URL) {
    pass('DATABASE_URL is configured');
} else {
    fail('DATABASE_URL not configured');
}

console.log('');

//==============================================
// 2. FILE PERMISSIONS
//==============================================
console.log('2. File Permissions\n');

// Check .env file exists and warn if it's in git
if (fs.existsSync('.env')) {
    pass('.env file exists');

    // Check if .gitignore exists
    if (fs.existsSync('.gitignore')) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');

        if (gitignore.includes('.env')) {
            pass('.env is in .gitignore');
        } else {
            fail('.env is NOT in .gitignore! Secrets could be committed to git!');
        }
    } else {
        fail('.gitignore not found! Create one and add .env');
    }
} else {
    warn('.env file not found. Using environment variables?');
}

// Check for common secret files
const secretFiles = ['credentials.json', 'service-account.json', 'private-key.pem'];
secretFiles.forEach(file => {
    if (fs.existsSync(file)) {
        warn(`Found sensitive file: ${file}. Make sure it's in .gitignore!`);
    }
});

console.log('');

//==============================================
// 3. DEPENDENCIES
//==============================================
console.log('3. Dependencies\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const securityPackages = {
    'bcrypt': 'Password hashing',
    'jsonwebtoken': 'JWT tokens',
    'helmet': 'Security headers',
    'express-rate-limit': 'Rate limiting',
    'validator': 'Input validation'
};

Object.entries(securityPackages).forEach(([pkg, purpose]) => {
    if (packageJson.dependencies && packageJson.dependencies[pkg]) {
        pass(`${pkg} installed (${purpose})`);
    } else {
        warn(`${pkg} not installed. Consider adding for ${purpose}`);
    }
});

// Check for outdated security-critical packages
console.log('\n⚠️  Run "npm audit" to check for vulnerable dependencies\n');

console.log('');

//==============================================
// 4. CODE PATTERNS
//==============================================
console.log('4. Code Patterns\n');

// Read server file
let serverCode = '';
try {
    if (fs.existsSync('server.js')) {
        serverCode = fs.readFileSync('server.js', 'utf8');
    } else if (fs.existsSync('server-simple.js')) {
        serverCode = fs.readFileSync('server-simple.js', 'utf8');
    } else {
        warn('Server file not found');
    }

    if (serverCode) {
        // Check for SQL injection vulnerabilities
        if (serverCode.includes('${') && serverCode.includes('query')) {
            warn('Possible SQL injection: Found string interpolation in query. Use parameterized queries!');
        } else {
            pass('No obvious SQL injection patterns found');
        }

        // Check for hardcoded secrets
        if (serverCode.match(/password\s*=\s*['"][^'"]+['"]/i)) {
            fail('Possible hardcoded password found in code!');
        } else {
            pass('No hardcoded passwords found');
        }

        // Check for console.log in production
        const consoleCount = (serverCode.match(/console\.log/g) || []).length;
        if (consoleCount > 10) {
            warn(`Found ${consoleCount} console.log statements. Remove for production.`);
        } else {
            pass('Minimal console.log usage');
        }

        // Check for CORS configuration
        if (serverCode.includes('cors')) {
            if (serverCode.includes('origin: "*"') || serverCode.includes("origin: '*'")) {
                warn('CORS allows ALL origins (*). Restrict to specific domains in production.');
            } else {
                pass('CORS configured (check if restrictive enough)');
            }
        } else {
            warn('CORS not configured. May block legitimate requests.');
        }

        // Check for helmet (security headers)
        if (serverCode.includes('helmet')) {
            pass('Helmet middleware for security headers');
        } else {
            warn('Helmet not used. Consider adding security headers.');
        }

        // Check for rate limiting
        if (serverCode.includes('rateLimit') || serverCode.includes('rate-limit')) {
            pass('Rate limiting implemented');
        } else {
            warn('No rate limiting found. Vulnerable to brute force attacks.');
        }
    }
} catch (e) {
    warn(`Error reading server code: ${e.message}`);
}

console.log('');

//==============================================
// 5. DATABASE SECURITY
//==============================================
console.log('5. Database Security\n');

// Check if using SQLite in production
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sqlite')) {
    warn('Using SQLite. For production, consider PostgreSQL or MySQL for better performance and features.');
} else if (process.env.DATABASE_URL) {
    pass('Using production-grade database');
}

// Check for database backups
if (fs.existsSync('backups/')) {
    pass('Backups directory exists');
} else {
    warn('No backups directory. Set up automated database backups!');
}

console.log('');

//==============================================
// 6. API SECURITY
//==============================================
console.log('6. API Security\n');

// Check for API documentation
if (fs.existsSync('API.md') || fs.existsSync('docs/api.md')) {
    pass('API documentation exists');
} else {
    warn('No API documentation found. Document all endpoints.');
}

// Check for authentication middleware
if (serverCode.includes('verify') && serverCode.includes('token')) {
    pass('JWT verification middleware found');
} else {
    warn('No obvious authentication middleware. Protect routes!');
}

console.log('');

//==============================================
// 7. HTTPS / SSL
//==============================================
console.log('7. HTTPS / SSL\n');

if (process.env.NODE_ENV === 'production') {
    if (serverCode.includes('https') || process.env.FORCE_SSL) {
        pass('HTTPS configuration found');
    } else {
        fail('NO HTTPS configuration! Production MUST use HTTPS!');
    }
} else {
    warn('Not in production mode. HTTPS check skipped.');
}

console.log('');

//==============================================
// SUMMARY
//==============================================
console.log('====================================================');
console.log('AUDIT SUMMARY');
console.log('====================================================\n');
console.log(`✅ Passed:   ${passed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`❌ Failed:   ${failed}\n`);

if (failed > 0) {
    console.log('🚨 CRITICAL: Fix all FAILURES before deploying to production!\n');
    process.exit(1);
} else if (warnings > 5) {
    console.log('⚠️  WARNINGS: Address warnings to improve security.\n');
    process.exit(0);
} else {
    console.log('✅ GOOD: Security posture looks reasonable. Always room for improvement!\n');
    process.exit(0);
}
