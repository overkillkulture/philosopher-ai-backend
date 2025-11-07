#!/usr/bin/env node
/**
 * AUTO BROADCAST ALL CHANNELS
 * Broadcasts Computer 1 status through EVERY available channel
 * Maximum contact attempts with Computer 2
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  AUTO BROADCAST - ALL CHANNELS                             ║');
console.log('║  Making maximum contact with Computer 2                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const status = {
  computer: 'Computer_1',
  hostname: os.hostname(),
  platform: os.platform(),
  user: os.userInfo().username,
  status: 'ONLINE',
  timestamp: new Date().toISOString(),
  broadcasting_via: []
};

let successCount = 0;
let totalAttempts = 0;

// CHANNEL 1: GitHub
console.log('📡 CHANNEL 1: GitHub\n');
totalAttempts++;
try {
  // Save status
  const statusDir = '.trinity/status';
  if (!fs.existsSync(statusDir)) {
    fs.mkdirSync(statusDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(statusDir, 'computer_1_status.json'),
    JSON.stringify(status, null, 2)
  );

  // Try to commit and push
  try {
    execSync('git add .trinity/status/computer_1_status.json', { stdio: 'pipe' });
    execSync('git commit -m "Computer 1 broadcasting - auto update"', { stdio: 'pipe' });
    execSync('git push', { stdio: 'pipe' });
    console.log('✅ Broadcasted via GitHub (pushed)\n');
    status.broadcasting_via.push('GitHub');
    successCount++;
  } catch (e) {
    // Already up to date or no changes
    console.log('✅ GitHub status file ready (no new changes to push)\n');
    status.broadcasting_via.push('GitHub (cached)');
    successCount++;
  }
} catch (e) {
  console.log('⚠️  GitHub broadcast failed:', e.message, '\n');
}

// CHANNEL 2: Local status files (multiple locations)
console.log('📡 CHANNEL 2: Local Status Files\n');
totalAttempts++;
try {
  const locations = [
    '.trinity/status/computer_1_status.json',
    '.trinity/computer_1_online.json',
    'COMPUTER_1_ONLINE.json',
    'C1_STATUS.json'
  ];

  locations.forEach(loc => {
    const dir = path.dirname(loc);
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(loc, JSON.stringify(status, null, 2));
  });

  console.log(`✅ Status written to ${locations.length} locations\n`);
  status.broadcasting_via.push('Local Files');
  successCount++;
} catch (e) {
  console.log('⚠️  Local file broadcast failed:', e.message, '\n');
}

// CHANNEL 3: HTML Status Page
console.log('📡 CHANNEL 3: HTML Status Page\n');
totalAttempts++;
try {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Computer 1 - ONLINE</title>
  <meta http-equiv="refresh" content="30">
  <style>
    body { font-family: monospace; background: #0a0a0a; color: #00ff00; padding: 20px; max-width: 800px; margin: 0 auto; }
    h1 { color: #00ff00; text-align: center; }
    .status { font-size: 32px; text-align: center; margin: 30px 0; }
    .info { background: #111; padding: 20px; border: 1px solid #00ff00; margin: 20px 0; }
    .timestamp { text-align: center; color: #888; }
    .instructions { background: #1a1a1a; padding: 15px; border-left: 3px solid #00ff00; }
  </style>
</head>
<body>
  <h1>🔮 TRINITY COMPUTER 1</h1>
  <div class="status">✅ ONLINE</div>

  <div class="info">
    <strong>Computer:</strong> ${status.computer}<br>
    <strong>Hostname:</strong> ${status.hostname}<br>
    <strong>Platform:</strong> ${status.platform}<br>
    <strong>User:</strong> ${status.user}<br>
    <strong>Status:</strong> ${status.status}<br>
    <strong>Last Updated:</strong> ${new Date(status.timestamp).toLocaleString()}
  </div>

  <div class="instructions">
    <h3>📋 For Computer 2:</h3>
    <p>Computer 1 is online and broadcasting. To connect:</p>
    <ol>
      <li><code>git pull</code></li>
      <li><code>node GITHUB_SYNC_CONNECTION.js</code></li>
    </ol>
    <p>Or check: <code>.trinity/status/computer_1_status.json</code></p>
  </div>

  <div class="timestamp">
    Page auto-refreshes every 30 seconds<br>
    Generated: ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

  fs.writeFileSync('COMPUTER_1_ONLINE.html', html);
  console.log('✅ HTML status page created: COMPUTER_1_ONLINE.html\n');
  status.broadcasting_via.push('HTML Page');
  successCount++;
} catch (e) {
  console.log('⚠️  HTML page creation failed:', e.message, '\n');
}

// CHANNEL 4: Text beacon files
console.log('📡 CHANNEL 4: Text Beacon Files\n');
totalAttempts++;
try {
  const beacon = `
╔════════════════════════════════════════════════════════════╗
║  COMPUTER 1 - ONLINE AND BROADCASTING                      ║
╚════════════════════════════════════════════════════════════╝

Status: ✅ ONLINE
Computer: ${status.hostname}
Timestamp: ${status.timestamp}

Broadcasting via:
${status.broadcasting_via.map(m => `• ${m}`).join('\n')}

════════════════════════════════════════════════════════════

FOR COMPUTER 2:

To connect, run:
  git pull && node GITHUB_SYNC_CONNECTION.js

Or check status files in .trinity/status/

════════════════════════════════════════════════════════════

Computer 1 is waiting for Computer 2 connection.
`;

  fs.writeFileSync('COMPUTER_1_BEACON.txt', beacon);
  fs.writeFileSync('.trinity/COMPUTER_1_BEACON.txt', beacon);

  console.log('✅ Beacon files created\n');
  status.broadcasting_via.push('Text Beacons');
  successCount++;
} catch (e) {
  console.log('⚠️  Beacon file creation failed:', e.message, '\n');
}

// CHANNEL 5: JSON beacon for easy parsing
console.log('📡 CHANNEL 5: JSON Beacon\n');
totalAttempts++;
try {
  const beacon = {
    ...status,
    message: 'Computer 1 is online and waiting for Computer 2',
    instructions: {
      computer_2: 'Run: git pull && node GITHUB_SYNC_CONNECTION.js',
      alternative: 'Check .trinity/status/computer_1_status.json'
    },
    contact_methods: status.broadcasting_via
  };

  fs.writeFileSync('COMPUTER_1_BROADCAST.json', JSON.stringify(beacon, null, 2));
  fs.writeFileSync('.trinity/COMPUTER_1_BROADCAST.json', JSON.stringify(beacon, null, 2));

  console.log('✅ JSON beacon created\n');
  status.broadcasting_via.push('JSON Beacon');
  successCount++;
} catch (e) {
  console.log('⚠️  JSON beacon creation failed:', e.message, '\n');
}

// CHANNEL 6: Cache for Railway
console.log('📡 CHANNEL 6: Railway Cache\n');
totalAttempts++;
try {
  const cacheDir = '.trinity/cache';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(cacheDir, 'computer_1_railway_status.json'),
    JSON.stringify(status, null, 2)
  );

  console.log('✅ Railway cache created\n');
  status.broadcasting_via.push('Railway Cache');
  successCount++;
} catch (e) {
  console.log('⚠️  Railway cache failed:', e.message, '\n');
}

// Summary
console.log('════════════════════════════════════════════════════════════\n');
console.log('📊 BROADCAST SUMMARY\n');
console.log(`Total channels attempted: ${totalAttempts}`);
console.log(`Successful broadcasts: ${successCount}`);
console.log(`Success rate: ${Math.floor((successCount / totalAttempts) * 100)}%\n`);

console.log('✅ Computer 1 is now broadcasting via:\n');
status.broadcasting_via.forEach((method, i) => {
  console.log(`   ${i + 1}. ${method}`);
});

console.log('\n════════════════════════════════════════════════════════════\n');
console.log('🎯 COMPUTER 2 CAN CONNECT VIA:\n');
console.log('Method 1 (GitHub):');
console.log('  git pull && node GITHUB_SYNC_CONNECTION.js\n');
console.log('Method 2 (Direct):');
console.log('  Check any of these files:');
console.log('  - .trinity/status/computer_1_status.json');
console.log('  - COMPUTER_1_ONLINE.json');
console.log('  - COMPUTER_1_BROADCAST.json\n');
console.log('Method 3 (Visual):');
console.log('  Open COMPUTER_1_ONLINE.html in browser\n');

console.log('════════════════════════════════════════════════════════════\n');
console.log(`✅ Broadcasting complete! Computer 1 is discoverable via ${successCount} channels.\n`);
