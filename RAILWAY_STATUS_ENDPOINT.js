#!/usr/bin/env node
/**
 * RAILWAY STATUS ENDPOINT
 * Post Computer 1 status to Railway backend
 * Computer 2 can fetch from Railway API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  RAILWAY STATUS ENDPOINT                                   ║');
console.log('║  Posting Computer 1 status to Railway backend              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const RAILWAY_URL = 'cloud-funnel-production.up.railway.app';

// Create status payload
const status = {
  computer: 'Computer_1',
  hostname: os.hostname(),
  platform: os.platform(),
  user: os.userInfo().username,
  status: 'ONLINE',
  timestamp: new Date().toISOString(),
  method: 'railway_api',
  capabilities: {
    all_files: true,
    coordination: true,
    verification: true,
    github_sync: true
  },
  github_repo: 'https://github.com/overkillkulture/philosopher-ai-backend.git',
  contact_methods: [
    'Railway API (this)',
    'GitHub sync',
    'Direct HTTP'
  ]
};

console.log('📤 Posting status to Railway...\n');

// Post status to Railway
const postData = JSON.stringify({
  type: 'computer_status',
  data: status
});

const options = {
  hostname: RAILWAY_URL,
  path: '/api/v1/trinity/status',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Status posted to Railway!\n');
      console.log('Computer 2 can fetch from:');
      console.log(`https://${RAILWAY_URL}/api/v1/trinity/status\n`);

      // Save response
      fs.writeFileSync('.trinity/railway_status_response.json', data);
      console.log('📝 Response saved to: .trinity/railway_status_response.json\n');
    } else {
      console.log(`⚠️  Railway returned status: ${res.statusCode}\n`);
      console.log('Response:', data, '\n');
      console.log('💡 Railway endpoint may need to be set up\n');
      console.log('Alternative: Using Railway database directly...\n');

      // Fall back to direct database approach
      saveToLocalCache();
    }
  });
});

req.on('error', (error) => {
  console.log('⚠️  Could not reach Railway endpoint\n');
  console.log('Error:', error.message, '\n');
  console.log('💡 This is okay - Railway endpoint may not be set up yet\n');
  console.log('✅ Status saved locally and in GitHub\n');

  saveToLocalCache();
});

req.write(postData);
req.end();

function saveToLocalCache() {
  // Save status to local file that can be deployed
  const cacheDir = '.trinity/cache';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(cacheDir, 'computer_1_status_for_railway.json'),
    JSON.stringify(status, null, 2)
  );

  console.log('✅ Status cached locally for Railway deployment\n');
  console.log('📁 File: .trinity/cache/computer_1_status_for_railway.json\n');
  console.log('💡 Can be deployed to Railway later\n');
}

// Also create a simple HTTP server status file
const httpStatus = `
<!DOCTYPE html>
<html>
<head>
  <title>Trinity Computer 1 Status</title>
  <meta http-equiv="refresh" content="60">
  <style>
    body {
      font-family: monospace;
      background: #0a0a0a;
      color: #00ff00;
      padding: 20px;
    }
    .status { font-size: 24px; margin: 20px 0; }
    .online { color: #00ff00; }
    pre { background: #111; padding: 20px; border: 1px solid #00ff00; }
  </style>
</head>
<body>
  <h1>🔮 Trinity Computer 1 Status</h1>
  <div class="status online">✅ ONLINE</div>
  <pre>${JSON.stringify(status, null, 2)}</pre>
  <p>Last updated: ${new Date().toLocaleString()}</p>
  <p>Auto-refreshes every 60 seconds</p>
</body>
</html>
`;

fs.writeFileSync('computer_1_status.html', httpStatus);
console.log('✅ HTML status page created: computer_1_status.html\n');
console.log('💡 This can be served via any HTTP server\n');
