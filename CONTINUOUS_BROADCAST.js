#!/usr/bin/env node
/**
 * CONTINUOUS BROADCAST
 * Continuously broadcasts Computer 1 status and watches for Computer 2
 * Updates every 30 seconds
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  CONTINUOUS BROADCAST SYSTEM                               ║');
console.log('║  Broadcasting Computer 1 + Watching for Computer 2         ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let broadcastCount = 0;
let computer2Detected = false;

function broadcast() {
  broadcastCount++;

  const status = {
    computer: 'Computer_1',
    hostname: os.hostname(),
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
    broadcast_number: broadcastCount,
    looking_for: 'Computer_2',
    uptime_seconds: process.uptime()
  };

  // Update all status files
  const statusFiles = [
    '.trinity/status/computer_1_status.json',
    'COMPUTER_1_ONLINE.json',
    'COMPUTER_1_BROADCAST.json'
  ];

  statusFiles.forEach(file => {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(status, null, 2));
  });

  console.log(`[${new Date().toLocaleTimeString()}] 📡 Broadcast #${broadcastCount} - Computer 1 ONLINE`);

  // Check for Computer 2
  checkForComputer2();
}

function checkForComputer2() {
  const c2Files = [
    '.trinity/status/computer_2_status.json',
    'COMPUTER_2_ONLINE.json',
    'COMPUTER_2_BROADCAST.json',
    'C2_STATUS.json'
  ];

  c2Files.forEach(file => {
    if (fs.existsSync(file)) {
      if (!computer2Detected) {
        computer2Detected = true;
        console.log('\n════════════════════════════════════════════════════════════');
        console.log('🎉 COMPUTER 2 DETECTED!');
        console.log('════════════════════════════════════════════════════════════\n');

        try {
          const c2Status = JSON.parse(fs.readFileSync(file, 'utf8'));
          console.log('Computer 2 Information:');
          console.log(`  Hostname: ${c2Status.hostname || 'Unknown'}`);
          console.log(`  Status: ${c2Status.status || 'Unknown'}`);
          console.log(`  Timestamp: ${c2Status.timestamp || 'Unknown'}`);
          console.log(`  File: ${file}\n`);

          // Create connection confirmation
          const confirmation = {
            message: 'Computer 1 sees Computer 2!',
            computer_1: os.hostname(),
            computer_2: c2Status.hostname,
            connection_established: new Date().toISOString(),
            trinity_power: '66%'
          };

          fs.writeFileSync(
            '.trinity/CONNECTION_CONFIRMED.json',
            JSON.stringify(confirmation, null, 2)
          );

          console.log('✅ Connection confirmed!');
          console.log('✅ Trinity Power: 66% (2/3 computers)\n');
        } catch (e) {
          console.log('⚠️  Could not parse Computer 2 status\n');
        }
      }
    }
  });

  // Also check GitHub for updates
  try {
    execSync('git fetch origin', { stdio: 'pipe', timeout: 5000 });
    const behind = execSync('git rev-list HEAD..origin/master --count', { encoding: 'utf8', stdio: 'pipe' }).trim();

    if (parseInt(behind) > 0 && !computer2Detected) {
      console.log(`   📥 ${behind} new commit(s) on GitHub - Computer 2 may have pushed`);
    }
  } catch (e) {
    // Git fetch failed, ignore
  }
}

// Initial broadcast
broadcast();

// Broadcast every 30 seconds
const intervalId = setInterval(broadcast, 30000);

console.log('\n🔄 Broadcasting every 30 seconds...');
console.log('👀 Watching for Computer 2...');
console.log('Press Ctrl+C to stop\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(intervalId);
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('📊 BROADCAST STATISTICS');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Total broadcasts: ${broadcastCount}`);
  console.log(`Computer 2 detected: ${computer2Detected ? 'Yes' : 'No'}`);
  console.log(`Runtime: ${Math.floor(process.uptime())} seconds`);
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('✅ Continuous broadcast stopped\n');
  process.exit(0);
});
