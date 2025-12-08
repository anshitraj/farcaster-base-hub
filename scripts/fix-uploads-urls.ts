/**
 * Script to fix /uploads URLs in database
 * 
 * Problem: Database has /uploads/ paths that don't exist in production (gitignored)
 * Solution: Update all /uploads URLs to use placeholder or fetch from original source
 * 
 * Run: npx tsx scripts/fix-uploads-urls.ts
 */

import { db } from "../src/lib/db";
import { MiniApp } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function fixUploadsUrls() {
  console.log("🔍 Checking for /uploads URLs in database...");
  
  try {
    // Find all apps with /uploads URLs
    const appsWithUploads = await db
      .select()
      .from(MiniApp)
      .where(
        sql`${MiniApp.iconUrl} LIKE '/uploads/%' OR ${MiniApp.headerImageUrl} LIKE '/uploads/%'`
      );

    console.log(`Found ${appsWithUploads.length} apps with /uploads URLs`);

    if (appsWithUploads.length === 0) {
      console.log("✅ No /uploads URLs found. Database is clean!");
      return;
    }

    // Show sample of affected apps
    console.log("\n📋 Sample of affected apps:");
    appsWithUploads.slice(0, 5).forEach(app => {
      console.log(`  - ${app.name}`);
      if (app.iconUrl?.startsWith("/uploads")) {
        console.log(`    Icon: ${app.iconUrl}`);
      }
      if (app.headerImageUrl?.startsWith("/uploads")) {
        console.log(`    Header: ${app.headerImageUrl}`);
      }
    });

    console.log("\n⚠️  These URLs don't exist in production (files are gitignored)");
    console.log("💡 Options:");
    console.log("  1. Set them to placeholder (quick fix)");
    console.log("  2. Re-fetch from original URLs and upload to Vercel Blob (proper fix)");
    console.log("\n🔧 Recommended: Run the auto-import script to re-fetch images from original sources");
    console.log("   This will download images and upload them to Vercel Blob");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixUploadsUrls()
  .then(() => {
    console.log("\n✅ Analysis complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

