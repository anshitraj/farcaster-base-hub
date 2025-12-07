/**
 * Migration Script: Supabase → Neon
 * 
 * This script:
 * 1. Connects to both Supabase (source) and Neon (target)
 * 2. Exports all data from Supabase
 * 3. Imports data into Neon
 * 4. Validates row counts match
 * 
 * Usage:
 *   OLD_DATABASE_URL="postgresql://..." NEW_DATABASE_URL="postgresql://..." node scripts/migrate-to-neon.js
 * 
 * Or set in .env.local:
 *   OLD_DATABASE_URL="your-supabase-url"
 *   NEW_DATABASE_URL="your-neon-url"
 */

require('dotenv').config({ path: '.env.local' });

const { Client } = require('pg');

// Get database URLs from environment
// OLD_DATABASE_URL = Supabase (source)
// NEW_DATABASE_URL = Neon (target)
const OLD_DB_URL = process.env.OLD_DATABASE_URL;
const NEW_DB_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;

// Validate URLs are not placeholders
const isPlaceholder = (url) => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  
  // Check for common placeholder patterns
  if (lower.includes('your-') || 
      lower.includes('example') || 
      lower === 'supabase' ||
      lower === 'neon' ||
      trimmed.length < 20) { // Too short to be a real connection string
    return true;
  }
  
  // Must start with postgresql://
  if (!trimmed.startsWith('postgresql://')) {
    return true;
  }
  
  // Must contain @ (username:password@host)
  if (!trimmed.includes('@')) {
    return true;
  }
  
  // Must contain a hostname (not just localhost or placeholder)
  const hostMatch = trimmed.match(/@([^:/]+)/);
  if (!hostMatch || hostMatch[1].includes('example') || hostMatch[1].includes('your-')) {
    return true;
  }
  
  return false;
};

// Debug: Show what we found
console.log('🔍 Environment check:');
if (!OLD_DB_URL || isPlaceholder(OLD_DB_URL)) {
  console.log('   OLD_DATABASE_URL: ❌ Not set or placeholder');
  if (OLD_DB_URL) {
    console.log('   Current value:', OLD_DB_URL.substring(0, 80) + (OLD_DB_URL.length > 80 ? '...' : ''));
  }
} else {
  const masked = OLD_DB_URL.replace(/:[^:@]+@/, ':****@');
  console.log('   OLD_DATABASE_URL: ✅ Set (' + masked.substring(0, 60) + '...)');
}
if (!NEW_DB_URL || isPlaceholder(NEW_DB_URL)) {
  console.log('   NEW_DATABASE_URL: ❌ Not set or placeholder');
  if (NEW_DB_URL) {
    console.log('   Current value:', NEW_DB_URL.substring(0, 80) + (NEW_DB_URL.length > 80 ? '...' : ''));
  }
} else {
  const masked = NEW_DB_URL.replace(/:[^:@]+@/, ':****@');
  console.log('   NEW_DATABASE_URL: ✅ Set (' + masked.substring(0, 60) + '...)');
}
console.log('');

// Validate URLs
if (!OLD_DB_URL || isPlaceholder(OLD_DB_URL)) {
  console.error('❌ Error: OLD_DATABASE_URL is not set or contains a placeholder');
  console.error('');
  console.error('   Please set OLD_DATABASE_URL in .env.local to your Supabase connection string:');
  console.error('   OLD_DATABASE_URL="postgresql://postgres.xxx:password@aws-1-region.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"');
  console.error('');
  console.error('   Get your Supabase connection string from:');
  console.error('   Supabase Dashboard → Settings → Database → Connection Pooling');
  process.exit(1);
}

if (!NEW_DB_URL || isPlaceholder(NEW_DB_URL)) {
  console.error('❌ Error: NEW_DATABASE_URL is not set or contains a placeholder');
  console.error('');
  console.error('   Please set NEW_DATABASE_URL in .env.local to your Neon connection string:');
  console.error('   NEW_DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"');
  console.error('');
  console.error('   Or ensure DATABASE_URL is set to your Neon connection string.');
  process.exit(1);
}

// List of all tables to migrate (in dependency order to respect foreign keys)
const TABLES = [
  'Developer',
  'MiniApp',
  'Badge',
  'Review',
  'AppEvent',
  'UserSession',
  'UserPoints',
  'PointsTransaction',
  'XPLog',
  'AppLaunchEvent',
  'PremiumSubscription',
  'AccessCode',
  'PremiumApp',
  'BoostRequest',
  'Collection',
  'CollectionItem',
  'UserProfile',
  'AnalyticsEvent',
  'Notification',
  'Advertisement',
  'Referral',
  'TopBaseApps',
];

async function getTableName(client, schemaName) {
  // Try to find the actual table name (case-insensitive)
  // Supabase/Prisma uses lowercase, Drizzle uses PascalCase
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1 
    AND LOWER(table_name) = LOWER($2)
    LIMIT 1
  `, ['public', schemaName]);
  
  if (result.rows.length > 0) {
    return result.rows[0].table_name; // Return actual table name from database
  }
  
  // Fallback: try lowercase
  const lowerResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1 
    AND table_name = $2
    LIMIT 1
  `, ['public', schemaName.toLowerCase()]);
  
  if (lowerResult.rows.length > 0) {
    return lowerResult.rows[0].table_name;
  }
  
  // Return original if not found (will cause error, but that's expected)
  return schemaName;
}

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND LOWER(table_name) = LOWER($1)
    ORDER BY ordinal_position
  `, [tableName]);
  return result.rows;
}

async function getTableData(client, tableName) {
  // Use the actual table name from database (case-sensitive)
  const actualTableName = await getTableName(client, tableName);
  const result = await client.query(`SELECT * FROM "${actualTableName}"`);
  return result.rows;
}

async function getRowCount(client, tableName) {
  // Use the actual table name from database (case-sensitive)
  const actualTableName = await getTableName(client, tableName);
  const result = await client.query(`SELECT COUNT(*) as count FROM "${actualTableName}"`);
  return parseInt(result.rows[0].count);
}

async function migrateTable(oldClient, newClient, tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);
  
  try {
    // First, check if table exists in source
    const actualSourceTableName = await getTableName(oldClient, tableName);
    if (actualSourceTableName !== tableName && actualSourceTableName.toLowerCase() === tableName.toLowerCase()) {
      console.log(`   ℹ️  Found table as: "${actualSourceTableName}" (case difference)`);
    }
    
    // Check if table exists
    const tableExists = await oldClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND LOWER(table_name) = LOWER($1)
      )
    `, [tableName]);
    
    if (!tableExists.rows[0].exists) {
      console.log(`   ⚠️  Table does not exist in source database`);
      return { tableName, sourceCount: 0, targetCount: 0, success: true, skipped: true };
    }
    
    // Get row count from source
    const sourceCount = await getRowCount(oldClient, tableName);
    console.log(`   Source rows: ${sourceCount}`);
    
    if (sourceCount === 0) {
      console.log(`   ⏭️  Skipping (empty table)`);
      return { tableName, sourceCount: 0, targetCount: 0, success: true };
    }
    
    // Get data from source
    const rows = await getTableData(oldClient, tableName);
    console.log(`   ✅ Fetched ${rows.length} rows from source`);
    
    // Get column names
    const columns = await getTableColumns(oldClient, tableName);
    const columnNames = columns.map(c => c.column_name);
    
    // Insert into target (using ON CONFLICT DO NOTHING to avoid duplicates)
    if (rows.length > 0) {
      // Build INSERT statement
      const placeholders = rows.map((_, i) => {
        const rowPlaceholders = columnNames.map((_, j) => `$${i * columnNames.length + j + 1}`).join(', ');
        return `(${rowPlaceholders})`;
      }).join(', ');
      
      const values = rows.flatMap(row => columnNames.map(col => {
        const value = row[col];
        // Handle null, undefined, and special types
        if (value === null || value === undefined) return null;
        if (value instanceof Date) return value.toISOString();
        
        // Handle arrays - check if column is array type
        const column = columns.find(c => c.column_name === col);
        const isArrayType = column?.data_type === 'ARRAY' || 
                           column?.data_type === 'array' ||
                           column?.udt_name === '_text' ||
                           column?.udt_name === '_varchar';
        
        if (isArrayType) {
          // If it's already a string that looks like JSON array, parse it
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                // Convert to PostgreSQL array format: {val1,val2,val3}
                return '{' + parsed.map(v => String(v).replace(/"/g, '\\"')).join(',') + '}';
              }
            } catch (e) {
              // Not JSON, might already be PostgreSQL array format
              if (value.startsWith('{') && value.endsWith('}')) {
                return value;
              }
            }
          }
          // If it's already an array, convert to PostgreSQL format
          if (Array.isArray(value)) {
            return '{' + value.map(v => String(v).replace(/"/g, '\\"')).join(',') + '}';
          }
        }
        
        return value;
      }));
      
      const columnList = columnNames.map(c => `"${c}"`).join(', ');
      const insertQuery = `
        INSERT INTO "${tableName}" (${columnList})
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;
      
      await newClient.query(insertQuery, values);
      console.log(`   ✅ Inserted ${rows.length} rows into target`);
    }
    
    // Validate row count
    const targetCount = await getRowCount(newClient, tableName);
    console.log(`   Target rows: ${targetCount}`);
    
    if (sourceCount !== targetCount) {
      console.warn(`   ⚠️  Row count mismatch! Source: ${sourceCount}, Target: ${targetCount}`);
    } else {
      console.log(`   ✅ Row counts match!`);
    }
    
    return { tableName, sourceCount, targetCount, success: sourceCount === targetCount };
  } catch (error) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
    return { tableName, sourceCount: 0, targetCount: 0, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Supabase → Neon Migration\n');
  
  // Validate URLs are valid PostgreSQL connection strings
  if (!OLD_DB_URL.startsWith('postgresql://')) {
    console.error('❌ Error: OLD_DATABASE_URL must start with "postgresql://"');
    console.error('   Current value:', OLD_DB_URL.substring(0, 50) + '...');
    process.exit(1);
  }
  
  if (!NEW_DB_URL.startsWith('postgresql://')) {
    console.error('❌ Error: NEW_DATABASE_URL must start with "postgresql://"');
    console.error('   Current value:', NEW_DB_URL.substring(0, 50) + '...');
    process.exit(1);
  }
  
  console.log('Source (Supabase):', OLD_DB_URL.replace(/:[^:@]+@/, ':****@'));
  console.log('Target (Neon):', NEW_DB_URL.replace(/:[^:@]+@/, ':****@'));
  
  const oldClient = new Client({ connectionString: OLD_DB_URL });
  const newClient = new Client({ connectionString: NEW_DB_URL });
  
  try {
    // Connect to both databases
    console.log('\n📡 Connecting to databases...');
    await oldClient.connect();
    console.log('   ✅ Connected to Supabase (source)');
    await newClient.connect();
    console.log('   ✅ Connected to Neon (target)');
    
    // Verify target database has tables (schema should already be migrated)
    console.log('\n🔍 Verifying target database schema...');
    const tableCheck = await newClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`   Found ${tableCheck.rows.length} tables in target database`);
    
    // Migrate each table
    const results = [];
    for (const tableName of TABLES) {
      const result = await migrateTable(oldClient, newClient, tableName);
      results.push(result);
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log('='.repeat(60));
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const mismatched = results.filter(r => r.success && r.sourceCount !== r.targetCount);
    
    results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      const countInfo = r.sourceCount === r.targetCount 
        ? `(${r.sourceCount} rows)` 
        : `(Source: ${r.sourceCount}, Target: ${r.targetCount})`;
      console.log(`${status} ${r.tableName.padEnd(25)} ${countInfo}`);
    });
    
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    if (mismatched.length > 0) {
      console.log(`⚠️  Mismatched: ${mismatched.length}`);
    }
    if (failed.length > 0) {
      console.log(`❌ Failed: ${failed.length}`);
      process.exit(1);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

main();

