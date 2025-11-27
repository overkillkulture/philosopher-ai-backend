#!/usr/bin/env node
/**
 * Environment Variable Validator
 * Built by C1 Cloud (CP3) - Autonomous Work
 *
 * Usage: node scripts/validate-env.js
 * Run before deployment to verify environment is configured
 */

require('dotenv').config();

console.log('\n🔐 ENVIRONMENT VALIDATION\n');
console.log('═'.repeat(50));

const required = [
  { name: 'JWT_SECRET', minLength: 32 },
  { name: 'DATABASE_URL', minLength: 1 }
];

const recommended = [
  { name: 'NODE_ENV', values: ['development', 'production', 'test'] },
  { name: 'PORT' },
  { name: 'ALLOWED_ORIGINS' }
];

const optional = [
  { name: 'ANTHROPIC_API_KEY' },
  { name: 'STRIPE_SECRET_KEY' },
  { name: 'SENDGRID_API_KEY' }
];

let errors = 0;
let warnings = 0;

// Check required
console.log('\n📋 REQUIRED:');
required.forEach(({ name, minLength }) => {
  const value = process.env[name];
  if (!value) {
    console.log(`   ❌ ${name} - MISSING`);
    errors++;
  } else if (minLength && value.length < minLength) {
    console.log(`   ❌ ${name} - Too short (min ${minLength} chars)`);
    errors++;
  } else {
    console.log(`   ✅ ${name} - Set (${value.length} chars)`);
  }
});

// Check recommended
console.log('\n📋 RECOMMENDED:');
recommended.forEach(({ name, values }) => {
  const value = process.env[name];
  if (!value) {
    console.log(`   ⚠️  ${name} - Not set (using default)`);
    warnings++;
  } else if (values && !values.includes(value)) {
    console.log(`   ⚠️  ${name} - Unusual value: ${value}`);
    warnings++;
  } else {
    console.log(`   ✅ ${name} - ${value}`);
  }
});

// Check optional
console.log('\n📋 OPTIONAL:');
optional.forEach(({ name }) => {
  const value = process.env[name];
  if (!value) {
    console.log(`   ⚪ ${name} - Not set (feature disabled)`);
  } else {
    console.log(`   ✅ ${name} - Configured`);
  }
});

// Summary
console.log('\n' + '═'.repeat(50));
if (errors > 0) {
  console.log(`\n❌ VALIDATION FAILED: ${errors} error(s), ${warnings} warning(s)`);
  console.log('\nFix required variables before deployment.\n');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  VALIDATION PASSED with ${warnings} warning(s)`);
  console.log('\nReview warnings before production deployment.\n');
  process.exit(0);
} else {
  console.log('\n✅ VALIDATION PASSED - All checks OK\n');
  process.exit(0);
}
