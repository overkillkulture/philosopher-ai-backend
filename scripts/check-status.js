#!/usr/bin/env node
/**
 * Quick System Status Check
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Usage: node scripts/check-status.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 PHILOSOPHER AI BACKEND - STATUS CHECK\n');
console.log('═'.repeat(50));

// Check 1: Package.json
try {
  const pkg = require('../package.json');
  console.log(`\n📦 Package: ${pkg.name} v${pkg.version}`);
  console.log(`   Node: ${pkg.engines?.node || 'not specified'}`);
} catch (e) {
  console.log('❌ package.json not found');
}

// Check 2: Environment files
console.log('\n🔐 Environment Files:');
const envFiles = ['.env', '.env.example', '.env.production.example'];
envFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`   ${exists ? '✅' : '⚪'} ${file}`);
});

// Check 3: Core files
console.log('\n📁 Core Files:');
const coreFiles = [
  'server.js',
  'Dockerfile',
  'docker-compose.yml',
  'database-schema.sql',
  'ecosystem.config.js',
  'Procfile'
];
coreFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

// Check 4: Directories
console.log('\n📂 Directories:');
const dirs = ['migrations', 'monitoring', 'tests', 'deploy'];
dirs.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, '..', dir));
  console.log(`   ${exists ? '✅' : '⚪'} ${dir}/`);
});

// Check 5: Node modules
const hasModules = fs.existsSync(path.join(__dirname, '..', 'node_modules'));
console.log(`\n📚 Dependencies: ${hasModules ? '✅ Installed' : '❌ Run npm install'}`);

// Check 6: Required env vars hint
console.log('\n🔑 Required Environment Variables:');
console.log('   - DATABASE_URL');
console.log('   - JWT_SECRET (32+ chars)');
console.log('   - NODE_ENV');

// Summary
console.log('\n' + '═'.repeat(50));
console.log('📋 DEPLOYMENT OPTIONS:');
console.log('   • Docker:  docker-compose up -d');
console.log('   • Railway: ./deploy/railway-deploy.sh');
console.log('   • PM2:     pm2 start ecosystem.config.js');
console.log('   • Manual:  node server.js');
console.log('═'.repeat(50) + '\n');
