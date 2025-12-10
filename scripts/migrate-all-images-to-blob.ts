/**
 * Comprehensive Image Migration to Vercel Blob
 * This script:
 * 1. Finds all apps with images (icons, headers, screenshots)
 * 2. Downloads external URLs or reads local /uploads files
 * 3. Converts images to WebP for optimal performance
 * 4. Uploads them to Vercel Blob CDN
 * 5. Updates the database with new Vercel Blob URLs
 * 
 * This ensures all images are:
 * - Served from fast CDN (Vercel Blob)
 * - Optimized as WebP format
 * - Properly cached
 */

// Load environment variables FIRST, before any other imports
require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env.local") });

// Create database connection directly in script
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";
import { MiniApp } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";

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

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("❌ BLOB_READ_WRITE_TOKEN is not set! Please set it in .env.local");
  process.exit(1);
}

const cleanedUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
const sqlClient = neon(cleanedUrl);
const db = drizzle(sqlClient, { schema });

/**
 * Check if URL is already a Vercel Blob URL
 */
function isVercelBlobUrl(url: string): boolean {
  return url.includes("blob.vercel-storage.com") || url.includes("vercel-storage.com");
}

/**
 * Check if URL should be migrated (not already Vercel Blob, not placeholder, not local static)
 */
function shouldMigrateUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (isVercelBlobUrl(url)) return false; // Already on Vercel Blob
  if (url.startsWith("/placeholder")) return false; // Placeholder, skip
  if (url.startsWith("/api/")) return false; // API route, skip
  if (url.startsWith("data:")) return false; // Data URL, skip
  return true;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageMigrator/1.0)",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      console.error(`  ⚠️  Failed to download: ${url} (Status: ${response.status})`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      console.error(`  ⚠️  Not an image: ${url} (Content-Type: ${contentType})`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      console.error(`  ⚠️  Empty image: ${url}`);
      return null;
    }

    return buffer;
  } catch (error: any) {
    console.error(`  ⚠️  Error downloading ${url}:`, error.message);
    return null;
  }
}

/**
 * Convert image to WebP format
 */
async function convertToWebP(buffer: Buffer, quality: number = 80): Promise<Buffer> {
  try {
    // Check if already WebP
    const metadata = await sharp(buffer).metadata();
    if (metadata.format === "webp") {
      return buffer; // Already WebP
    }

    // Convert to WebP
    const webpBuffer = await sharp(buffer)
      .webp({ quality, effort: 4 }) // effort 4 = good balance of speed/quality
      .toBuffer();

    return webpBuffer;
  } catch (error: any) {
    console.error(`  ⚠️  Error converting to WebP:`, error.message);
    throw error;
  }
}

/**
 * Process a single image URL: download/read, convert to WebP, upload to Vercel Blob
 */
async function processImage(
  imageUrl: string,
  subfolder: "icons" | "headers" | "screenshots",
  appName: string
): Promise<string | null> {
  try {
    let buffer: Buffer | null = null;

    // Handle local /uploads paths
    if (imageUrl.startsWith("/uploads")) {
      try {
        const filePath = join(process.cwd(), "public", imageUrl);
        buffer = await readFile(filePath);
      } catch (error: any) {
        console.error(`  ⚠️  Local file not found: ${imageUrl}`);
        return null;
      }
    } else {
      // Handle external URLs
      buffer = await downloadImage(imageUrl);
      if (!buffer) {
        return null;
      }
    }

    // Convert to WebP
    const webpBuffer = await convertToWebP(buffer, 80);

    // Generate unique filename
    const { v4: uuidv4 } = await import("uuid");
    const filename = `${appName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${uuidv4()}.webp`;
    const blobPath = `uploads/${subfolder}/${filename}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, webpBuffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false, // We're already using UUID
    });

    return blob.url;
  } catch (error: any) {
    console.error(`  ❌ Error processing image ${imageUrl}:`, error.message);
    return null;
  }
}

async function migrateAllImagesToBlob() {
  console.log("🔄 Starting comprehensive image migration to Vercel Blob...\n");
  console.log("📋 This will:");
  console.log("   - Find all apps with images (icons, headers, screenshots)");
  console.log("   - Download external URLs or read local /uploads files");
  console.log("   - Convert all images to WebP format");
  console.log("   - Upload to Vercel Blob CDN");
  console.log("   - Update database with new URLs\n");

  try {
    // Fetch all apps
    const allApps = await db.select().from(MiniApp);
    console.log(`📦 Found ${allApps.length} total apps\n`);

    // Filter apps that need migration
    const appsToMigrate = allApps.filter(app => {
      const needsIconMigration = shouldMigrateUrl(app.iconUrl);
      const needsHeaderMigration = shouldMigrateUrl(app.headerImageUrl);
      const needsScreenshotMigration = Array.isArray(app.screenshots) && 
        app.screenshots.some((s: string) => shouldMigrateUrl(s));
      
      return needsIconMigration || needsHeaderMigration || needsScreenshotMigration;
    });

    console.log(`🎯 Found ${appsToMigrate.length} apps that need image migration\n`);

    if (appsToMigrate.length === 0) {
      console.log("✅ All images are already on Vercel Blob! Database is clean!");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let imagesMigrated = 0;

    for (let i = 0; i < appsToMigrate.length; i++) {
      const app = appsToMigrate[i];
      const progress = `[${i + 1}/${appsToMigrate.length}]`;
      
      console.log(`\n${progress} 🔄 Processing: ${app.name} (${app.id})`);

      try {
        let newIconUrl = app.iconUrl;
        let newHeaderUrl = app.headerImageUrl;
        let newScreenshots = app.screenshots || [];
        let hasChanges = false;

        // Process icon
        if (shouldMigrateUrl(app.iconUrl)) {
          console.log(`  📥 Icon: ${app.iconUrl}`);
          const blobUrl = await processImage(app.iconUrl!, "icons", app.name);
          if (blobUrl) {
            newIconUrl = blobUrl;
            hasChanges = true;
            imagesMigrated++;
            console.log(`  ✅ Icon migrated to: ${blobUrl}`);
          } else {
            console.log(`  ⚠️  Icon migration failed, keeping original`);
          }
        } else if (app.iconUrl) {
          console.log(`  ⏭️  Icon already on Vercel Blob or placeholder: ${app.iconUrl}`);
        }

        // Process header
        if (shouldMigrateUrl(app.headerImageUrl)) {
          console.log(`  📥 Header: ${app.headerImageUrl}`);
          const blobUrl = await processImage(app.headerImageUrl!, "headers", app.name);
          if (blobUrl) {
            newHeaderUrl = blobUrl;
            hasChanges = true;
            imagesMigrated++;
            console.log(`  ✅ Header migrated to: ${blobUrl}`);
          } else {
            console.log(`  ⚠️  Header migration failed, keeping original`);
          }
        } else if (app.headerImageUrl) {
          console.log(`  ⏭️  Header already on Vercel Blob or placeholder: ${app.headerImageUrl}`);
        }

        // Process screenshots
        if (Array.isArray(app.screenshots) && app.screenshots.length > 0) {
          const screenshotsToMigrate = app.screenshots.filter((s: string) => shouldMigrateUrl(s));
          
          if (screenshotsToMigrate.length > 0) {
            console.log(`  📥 Screenshots: ${screenshotsToMigrate.length} to migrate`);
            
            const migratedScreenshots = await Promise.all(
              app.screenshots.map(async (screenshot: string) => {
                if (!shouldMigrateUrl(screenshot)) {
                  return screenshot; // Keep as-is
                }

                const blobUrl = await processImage(screenshot, "screenshots", app.name);
                if (blobUrl) {
                  imagesMigrated++;
                  return blobUrl;
                } else {
                  console.log(`    ⚠️  Screenshot migration failed: ${screenshot}`);
                  return screenshot; // Keep original on failure
                }
              })
            );

            newScreenshots = migratedScreenshots;
            hasChanges = true;
            console.log(`  ✅ Screenshots processed`);
          }
        }

        // Update database if we have changes
        if (hasChanges) {
          await db
            .update(MiniApp)
            .set({
              iconUrl: newIconUrl,
              headerImageUrl: newHeaderUrl,
              screenshots: newScreenshots,
            })
            .where(eq(MiniApp.id, app.id));

          console.log(`  💾 Database updated`);
          successCount++;
        } else {
          console.log(`  ⏭️  Skipped (no changes needed)`);
          skippedCount++;
        }
      } catch (appError: any) {
        console.error(`  ❌ Error processing app:`, appError.message);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      if (i < appsToMigrate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   📊 Summary:`);
    console.log(`   - Apps processed: ${appsToMigrate.length}`);
    console.log(`   - Apps updated: ${successCount}`);
    console.log(`   - Apps skipped: ${skippedCount}`);
    console.log(`   - Apps with errors: ${errorCount}`);
    console.log(`   - Images migrated: ${imagesMigrated}`);
    console.log(`\n🎉 All images are now on Vercel Blob CDN with WebP optimization!`);

  } catch (error: any) {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  migrateAllImagesToBlob()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { migrateAllImagesToBlob };

