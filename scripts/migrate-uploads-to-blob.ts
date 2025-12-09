/**
 * Migrate /uploads URLs to Vercel Blob
 * This script:
 * 1. Finds all apps with /uploads paths
 * 2. Reads the files from local public/uploads/
 * 3. Uploads them to Vercel Blob
 * 4. Updates the database with new Vercel Blob URLs
 */

// Load environment variables FIRST, before any other imports
require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env.local") });

// Create database connection directly in script (don't import db.ts which loads at module time)
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";
import { MiniApp } from "../src/db/schema";
import { sql, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import { join } from "path";

// Clean DATABASE_URL: Remove channel_binding parameter which causes issues
function cleanDatabaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete("channel_binding");
    return urlObj.toString();
  } catch {
    return url.replace(/[?&]channel_binding=[^&]*/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set!");
  process.exit(1);
}

const cleanedUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
const sqlClient = neon(cleanedUrl);
const db = drizzle(sqlClient, { schema });

async function migrateUploadsToBlob() {
  console.log("🔄 Starting migration of /uploads URLs to Vercel Blob...\n");

  try {
    // Find all apps with /uploads URLs
    const appsWithUploads = await db
      .select()
      .from(MiniApp)
      .where(
        sql`${MiniApp.iconUrl} LIKE '/uploads/%' OR ${MiniApp.headerImageUrl} LIKE '/uploads/%'`
      );

    console.log(`📦 Found ${appsWithUploads.length} apps with /uploads URLs\n`);

    if (appsWithUploads.length === 0) {
      console.log("✅ No /uploads URLs found. Database is clean!");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const app of appsWithUploads) {
      console.log(`\n🔄 Processing: ${app.name} (${app.id})`);

      try {
        let newIconUrl = app.iconUrl;
        let newHeaderUrl = app.headerImageUrl;

        // Process icon
        if (app.iconUrl?.startsWith("/uploads")) {
          console.log(`  📥 Icon: ${app.iconUrl}`);
          try {
            // Read file from local public folder
            const filePath = join(process.cwd(), "public", app.iconUrl);
            const buffer = await readFile(filePath);

            // Extract filename
            const pathParts = app.iconUrl.split("/");
            const filename = pathParts[pathParts.length - 1];
            const subfolder = pathParts[pathParts.length - 2]; // icons, headers, etc.

            // Upload to Vercel Blob
            const blobPath = `uploads/${subfolder}/${filename}`;
            const blob = await put(blobPath, buffer, {
              access: "public",
              contentType: filename.endsWith(".webp") 
                ? "image/webp" 
                : filename.endsWith(".png")
                ? "image/png"
                : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                ? "image/jpeg"
                : "image/webp",
            });

            newIconUrl = blob.url;
            console.log(`  ✅ Icon uploaded to Blob: ${blob.url}`);
          } catch (iconError: any) {
            console.error(`  ❌ Failed to process icon:`, iconError.message);
            errorCount++;
            continue; // Skip this app if icon upload fails
          }
        }

        // Process header
        if (app.headerImageUrl?.startsWith("/uploads")) {
          console.log(`  📥 Header: ${app.headerImageUrl}`);
          try {
            // Read file from local public folder
            const filePath = join(process.cwd(), "public", app.headerImageUrl);
            const buffer = await readFile(filePath);

            // Extract filename
            const pathParts = app.headerImageUrl.split("/");
            const filename = pathParts[pathParts.length - 1];
            const subfolder = pathParts[pathParts.length - 2];

            // Upload to Vercel Blob
            const blobPath = `uploads/${subfolder}/${filename}`;
            const blob = await put(blobPath, buffer, {
              access: "public",
              contentType: filename.endsWith(".webp") 
                ? "image/webp" 
                : filename.endsWith(".png")
                ? "image/png"
                : filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                ? "image/jpeg"
                : "image/webp",
            });

            newHeaderUrl = blob.url;
            console.log(`  ✅ Header uploaded to Blob: ${blob.url}`);
          } catch (headerError: any) {
            console.error(`  ❌ Failed to process header:`, headerError.message);
            // Continue anyway - icon might have succeeded
          }
        }

        // Update database if we got new URLs
        if (newIconUrl !== app.iconUrl || newHeaderUrl !== app.headerImageUrl) {
          await db
            .update(MiniApp)
            .set({
              iconUrl: newIconUrl,
              headerImageUrl: newHeaderUrl,
            })
            .where(eq(MiniApp.id, app.id));

          console.log(`  💾 Database updated`);
          successCount++;
        } else {
          console.log(`  ⏭️  Skipped (no changes)`);
          skippedCount++;
        }
      } catch (appError: any) {
        console.error(`  ❌ Error processing app:`, appError.message);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Skipped: ${skippedCount}`);

  } catch (error: any) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateUploadsToBlob()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateUploadsToBlob };
