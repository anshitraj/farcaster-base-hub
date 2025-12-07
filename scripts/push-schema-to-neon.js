/**
 * Push Drizzle schema to Neon database
 * This creates all tables in your Neon database
 */

require('dotenv').config({ path: '.env.local' });

const { execSync } = require('child_process');

console.log('🚀 Pushing Drizzle schema to Neon...\n');

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in .env.local');
  console.error('   Please set DATABASE_URL to your Neon connection string');
  process.exit(1);
}

// Mask password in URL for display
const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
console.log('📡 Connecting to:', maskedUrl);
console.log('');

try {
  // Run drizzle-kit push
  execSync('npm run drizzle:push', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
  
  console.log('\n✅ Schema pushed successfully!');
  console.log('   All tables should now exist in your Neon database.');
  console.log('\n📋 Next steps:');
  console.log('   1. Run data migration: node scripts/migrate-to-neon.js');
  console.log('   2. Verify tables exist in Neon dashboard');
} catch (error) {
  console.error('\n❌ Failed to push schema:', error.message);
  process.exit(1);
}

