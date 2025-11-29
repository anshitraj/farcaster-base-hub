#!/usr/bin/env node
// Load environment variables from .env.local first, then .env
// This ensures DATABASE_URL from .env.local takes precedence over .env
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Load .env.local first (highest priority)
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath, override: false });
}

// Then load .env (lower priority, won't override .env.local)
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, override: false });
}

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found!');
  console.error('   Make sure DATABASE_URL is set in .env.local');
  console.error('   .env.local is gitignored and should contain sensitive variables');
  process.exit(1);
}

// Get the Prisma command and arguments
const command = process.argv[2];
const args = process.argv.slice(3);

// Find prisma binary
const prismaPath = path.join(__dirname, '..', 'node_modules', '.bin', 'prisma');

const prismaProcess = spawn(prismaPath, [command, ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

prismaProcess.on('close', (code) => {
  process.exit(code || 0);
});

prismaProcess.on('error', (error) => {
  console.error('Error running Prisma:', error);
  process.exit(1);
});

