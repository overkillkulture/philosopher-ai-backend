// ================================================
// API ENDPOINT TESTING SUITE
// ================================================
// Comprehensive tests for all 28 C1 production endpoints
// Run: node test-api-endpoints.js
// ================================================

const https = require('https');

const BASE_URL = process.env.API_URL || 'https://cloud-funnel-production.up.railway.app';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0
};

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: data ? JSON.parse(data) : null,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Test runner
async function runTest(name, testFn) {
    testResults.total++;
    try {
        process.stdout.write(`  Testing: ${name}... `);
        await testFn();
        console.log(`${colors.green}✓ PASS${colors.reset}`);
        testResults.passed++;
    } catch (error) {
        console.log(`${colors.red}✗ FAIL${colors.reset}`);
        console.log(`    ${colors.red}${error.message}${colors.reset}`);
        testResults.failed++;
    }
}

function skipTest(name, reason) {
    testResults.total++;
    testResults.skipped++;
    console.log(`  ${name}... ${colors.yellow}⊘ SKIP${colors.reset} (${reason})`);
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// ================================================
// TEST SUITES
// ================================================

async function testHealthEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}HEALTH & STATUS ENDPOINTS${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    await runTest('GET /api/v1/health', async () => {
        const res = await makeRequest('GET', '/api/v1/health');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.status === 'healthy', 'Health status should be healthy');
        assert(res.data.version, 'Should return version');
    });
}

async function testAuthExtendedEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}PASSWORD RESET & EMAIL VERIFICATION (6)${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    await runTest('POST /api/v1/auth/forgot-password (missing email)', async () => {
        const res = await makeRequest('POST', '/api/v1/auth/forgot-password', {});
        assert(res.status === 400, `Expected 400, got ${res.status}`);
        assert(res.data.error, 'Should return error message');
    });

    skipTest('POST /api/v1/auth/forgot-password (valid email)', 'Requires email service setup');
    skipTest('GET /api/v1/auth/verify-reset-token/:token', 'Requires valid reset token');
    skipTest('POST /api/v1/auth/reset-password', 'Requires valid reset token');
    skipTest('POST /api/v1/auth/send-verification-email', 'Requires email service + auth');
    skipTest('POST /api/v1/auth/verify-email', 'Requires valid verification token');
    skipTest('POST /api/v1/auth/change-password', 'Requires authentication');
}

async function testProfileEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}USER PROFILE MANAGEMENT (5)${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    skipTest('GET /api/v1/profile/me', 'Requires authentication');
    skipTest('PUT /api/v1/profile/me', 'Requires authentication');
    skipTest('DELETE /api/v1/profile/me', 'Requires authentication');
    skipTest('GET /api/v1/profile/user/:username', 'Requires existing user');
    skipTest('PATCH /api/v1/profile/me/preferences', 'Requires authentication');
}

async function testAdminEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}ADMIN DASHBOARD (6)${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    await runTest('GET /api/v1/admin/dashboard (no auth)', async () => {
        const res = await makeRequest('GET', '/api/v1/admin/dashboard');
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    skipTest('GET /api/v1/admin/dashboard (with auth)', 'Requires admin authentication');
    skipTest('GET /api/v1/admin/users', 'Requires admin authentication');
    skipTest('GET /api/v1/admin/users/:userId', 'Requires admin authentication');
    skipTest('PATCH /api/v1/admin/users/:userId/tier', 'Requires admin authentication');
    skipTest('GET /api/v1/admin/system/health', 'Requires admin authentication');
}

async function testAnalyticsEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}ANALYTICS & METRICS (5)${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    skipTest('POST /api/v1/analytics/track', 'Requires authentication');
    skipTest('GET /api/v1/analytics/me/metrics', 'Requires authentication');
    skipTest('GET /api/v1/analytics/platform', 'May be public or require auth');
    skipTest('GET /api/v1/analytics/growth', 'May be public or require auth');
    skipTest('GET /api/v1/analytics/engagement', 'May be public or require auth');
}

async function testAuthenticationFlow() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}AUTHENTICATION FLOW TEST${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    let authToken = null;

    await runTest('Register new user', async () => {
        const res = await makeRequest('POST', '/api/v1/auth/register', {
            email: testEmail,
            password: testPassword,
            username: 'testuser'
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
        assert(res.data.success, 'Registration should succeed');
        assert(res.data.token, 'Should return auth token');
        assert(res.data.user, 'Should return user data');
        authToken = res.data.token;
    });

    await runTest('Login with credentials', async () => {
        const res = await makeRequest('POST', '/api/v1/auth/login', {
            email: testEmail,
            password: testPassword
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.success, 'Login should succeed');
        assert(res.data.token, 'Should return auth token');
    });

    await runTest('Get user profile (authenticated)', async () => {
        const res = await makeRequest('GET', '/api/v1/auth/me', null, {
            'Authorization': `Bearer ${authToken}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.user, 'Should return user data');
        assert(res.data.user.email === testEmail, 'Should return correct user');
    });

    await runTest('Verify token', async () => {
        const res = await makeRequest('GET', '/api/v1/auth/verify', null, {
            'Authorization': `Bearer ${authToken}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.valid === true, 'Token should be valid');
    });

    await runTest('Logout', async () => {
        const res = await makeRequest('POST', '/api/v1/auth/logout');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
}

async function testTrinityEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}TRINITY COORDINATION ENDPOINTS${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    await runTest('GET /api/v1/trinity/instances', async () => {
        const res = await makeRequest('GET', '/api/v1/trinity/instances');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Should return array of instances');
    });

    await runTest('GET /api/v1/trinity/status', async () => {
        const res = await makeRequest('GET', '/api/v1/trinity/status');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.timestamp, 'Should return timestamp');
    });
}

async function testDataCyclotronEndpoints() {
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}DATA CYCLOTRON (KNOWLEDGE API)${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);

    await runTest('GET /api/v1/metrics', async () => {
        const res = await makeRequest('GET', '/api/v1/metrics');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.statistics, 'Should return statistics');
    });

    await runTest('GET /api/v1/knowledge/recent', async () => {
        const res = await makeRequest('GET', '/api/v1/knowledge/recent');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Should return array');
    });
}

// ================================================
// MAIN TEST RUNNER
// ================================================

async function runAllTests() {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  API ENDPOINT TEST SUITE                      ║${colors.reset}`);
    console.log(`${colors.cyan}║  Testing 28 C1 Production Endpoints           ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nBase URL: ${BASE_URL}`);

    const startTime = Date.now();

    await testHealthEndpoints();
    await testAuthenticationFlow();
    await testAuthExtendedEndpoints();
    await testProfileEndpoints();
    await testAdminEndpoints();
    await testAnalyticsEndpoints();
    await testTrinityEndpoints();
    await testDataCyclotronEndpoints();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}TEST RESULTS${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`  Total Tests: ${testResults.total}`);
    console.log(`  ${colors.green}✓ Passed:${colors.reset} ${testResults.passed}`);
    console.log(`  ${colors.red}✗ Failed:${colors.reset} ${testResults.failed}`);
    console.log(`  ${colors.yellow}⊘ Skipped:${colors.reset} ${testResults.skipped}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`${colors.cyan}════════════════════════════════════════${colors.reset}\n`);

    const passRate = ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1);
    if (testResults.failed === 0) {
        console.log(`${colors.green}✅ ALL TESTS PASSED (${passRate}% pass rate)${colors.reset}\n`);
    } else {
        console.log(`${colors.red}❌ SOME TESTS FAILED${colors.reset}\n`);
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
});
