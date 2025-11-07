#!/usr/bin/env node
/**
 * GITHUB AUTO PULL WATCHER
 * Automatically pulls from GitHub every minute
 * Detects when Computer 2 pushes status
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  GITHUB AUTO PULL WATCHER                                  ║');
console.log('║  Watching for Computer 2 via GitHub                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let pullCount = 0;
let lastKnownComputers = [];

function checkGitHub() {
  pullCount++;

  try {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Pull #${pullCount} - Checking GitHub...`);

    // Fetch latest
    execSync('git fetch origin', { stdio: 'pipe' });

    // Check if behind
    const behind = execSync('git rev-list HEAD..origin/master --count', { encoding: 'utf8', stdio: 'pipe' }).trim();

    if (parseInt(behind) > 0) {
      console.log(`   📥 Found ${behind} new commit(s) - Pulling...`);

      // Pull the changes
      const pullOutput = execSync('git pull origin master', { encoding: 'utf8', stdio: 'pipe' });
      console.log('   ✅ Pulled successfully');

      // Check for new computers
      checkForNewComputers();
    } else {
      console.log('   ✅ Up to date');
    }

  } catch (e) {
    console.log('   ⚠️  Pull failed:', e.message.split('\n')[0]);
  }

  // Always check for computers (in case files were created locally)
  checkForNewComputers();
}

function checkForNewComputers() {
  const statusDir = '.trinity/status';

  if (!fs.existsSync(statusDir)) {
    return;
  }

  const files = fs.readdirSync(statusDir).filter(f => f.endsWith('_status.json'));
  const currentComputers = [];

  files.forEach(file => {
    try {
      const status = JSON.parse(fs.readFileSync(path.join(statusDir, file), 'utf8'));
      currentComputers.push({
        name: status.computer || file,
        hostname: status.hostname,
        file: file
      });
    } catch (e) {
      // Invalid JSON, skip
    }
  });

  // Check for new computers
  currentComputers.forEach(comp => {
    const wasKnown = lastKnownComputers.some(k => k.file === comp.file);

    if (!wasKnown) {
      console.log('\n════════════════════════════════════════════════════════════');
      console.log(`🎉 NEW COMPUTER DETECTED: ${comp.name}`);
      console.log('════════════════════════════════════════════════════════════');
      console.log(`   Hostname: ${comp.hostname}`);
      console.log(`   File: ${comp.file}`);
      console.log('════════════════════════════════════════════════════════════\n');
    }
  });

  lastKnownComputers = currentComputers;

  // Show current network status
  const computerCount = currentComputers.length;
  const power = Math.floor((computerCount / 3) * 100);

  if (pullCount % 5 === 0) { // Show every 5th pull
    console.log(`   📊 Network: ${computerCount}/3 computers (${power}% power)`);
  }
}

// Initial check
console.log('🚀 Starting GitHub watcher...\n');
checkGitHub();

// Check every 60 seconds
const intervalId = setInterval(checkGitHub, 60000);

console.log('\n🔄 Pulling from GitHub every 60 seconds...');
console.log('👀 Will notify when Computer 2 appears...');
console.log('Press Ctrl+C to stop\n');

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(intervalId);
  console.log('\n\n════════════════════════════════════════════════════════════');
  console.log('📊 WATCHER STATISTICS');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Total pulls: ${pullCount}`);
  console.log(`Computers detected: ${lastKnownComputers.length}`);
  lastKnownComputers.forEach(comp => {
    console.log(`  • ${comp.name} (${comp.hostname})`);
  });
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('✅ GitHub watcher stopped\n');
  process.exit(0);
});
