import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

console.log("🔍 Testing Drizzle Config...\n");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set!");
  console.log("\n💡 Check your .env.local file");
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
console.log("✅ DATABASE_URL found:");
console.log(`   ${dbUrl.substring(0, 60)}...`);
console.log(`   Length: ${dbUrl.length} characters`);

// Check if it's a valid PostgreSQL URL
if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
  console.error("\n❌ DATABASE_URL doesn't look like a PostgreSQL connection string");
  console.log("   Should start with: postgresql://");
  process.exit(1);
}

console.log("\n✅ DATABASE_URL format looks valid!");
console.log("\n💡 Try running: npm run drizzle:push");

