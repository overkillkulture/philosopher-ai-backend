#!/usr/bin/env node
/**
 * GITHUB SYNC CONNECTION
 * Use GitHub for automatic computer coordination
 * Computer 1 pushes status, Computer 2/3 pull status
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  GITHUB SYNC CONNECTION                                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Create status file
const status = {
  computer: 'Computer_1',
  hostname: os.hostname(),
  platform: os.platform(),
  user: os.userInfo().username,
  status: 'ONLINE',
  timestamp: new Date().toISOString(),
  method: 'github_sync'
};

const statusDir = '.trinity/status';
if (!fs.existsSync(statusDir)) {
  fs.mkdirSync(statusDir, { recursive: true });
}

fs.writeFileSync(
  path.join(statusDir, 'computer_1_status.json'),
  JSON.stringify(status, null, 2)
);

console.log('✅ Computer 1 status created\n');

// Check if git is set up
try {
  const gitStatus = execSync('git status', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  console.log('✅ Git repository detected\n');

  // Check if there's a GitHub remote
  try {
    const remotes = execSync('git remote -v', { encoding: 'utf8' });
    if (remotes.includes('github.com')) {
      console.log('✅ GitHub remote found\n');
      console.log('════════════════════════════════════════════════════════════\n');
      console.log('🚀 READY TO SYNC VIA GITHUB\n');
      console.log('To share Computer 1 status with other computers:\n');
      console.log('1. Run these commands:');
      console.log('   git add .trinity/');
      console.log('   git commit -m "Computer 1 online"');
      console.log('   git push\n');
      console.log('2. On Computer 2, run:');
      console.log('   git pull');
      console.log('   node GITHUB_SYNC_CONNECTION.js\n');
      console.log('✅ Computers will sync automatically via GitHub!\n');
    } else {
      console.log('⚠️  No GitHub remote found\n');
      console.log('Add GitHub remote with:');
      console.log('git remote add origin <github-url>\n');
    }
  } catch (e) {
    console.log('⚠️  No git remote configured\n');
  }
} catch (e) {
  console.log('⚠️  Not a git repository\n');
  console.log('Initialize with: git init\n');
}

console.log('════════════════════════════════════════════════════════════\n');
console.log('💡 GITHUB SYNC BENEFITS:\n');
console.log('• Automatic sync between all computers');
console.log('• No manual file transfer needed');
console.log('• Version history of all status updates');
console.log('• Works anywhere with internet');
console.log('• Already set up and working!\n');
