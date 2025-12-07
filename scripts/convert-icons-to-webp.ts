/**
 * Migration Script: Convert All PNG/JPG App Icons to WebP
 * 
 * This script:
 * 1. Fetches all apps with PNG/JPG icon URLs
 * 2. Downloads each image
 * 3. Converts to WebP using sharp
 * 4. Saves to public/uploads/icons/
 * 5. Updates database with new WebP URLs
 * 
 * Usage:
 *   npx tsx scripts/convert-icons-to-webp.ts
 * 
 * Or:
 *   node --loader tsx scripts/convert-icons-to-webp.ts
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { MiniApp } from "../src/db/schema";
import { eq, or, like, and, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve, extname, basename, dirname } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Configuration
const UPLOAD_DIR = resolve(process.cwd(), "public", "uploads", "icons");
const WEBP_QUALITY = 75;
const MAX_DOWNLOAD_SIZE = 10 * 1024 * 1024; // 10MB max
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds

// Check for dry-run mode
const DRY_RUN = process.argv.includes("--dry-run") || process.argv.includes("-d");

// Initialize database connection
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

interface ConversionResult {
  appId: string;
  appName: string;
  originalUrl: string;
  newUrl: string | null;
  success: boolean;
  error?: string;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageConverter/1.0)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error(`Not an image: ${contentType}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_DOWNLOAD_SIZE) {
      throw new Error(`Image too large: ${contentLength} bytes`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_DOWNLOAD_SIZE) {
      throw new Error(`Image too large: ${buffer.length} bytes`);
    }

    return buffer;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Download timeout");
    }
    throw error;
  }
}

/**
 * Convert image buffer to WebP
 */
async function convertToWebP(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const webpBuffer = await sharp(imageBuffer)
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    return webpBuffer;
  } catch (error: any) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
}

/**
 * Generate a safe filename from URL
 */
function generateFilename(originalUrl: string, appId: string): string {
  try {
    const url = new URL(originalUrl);
    const originalName = basename(url.pathname);
    const nameWithoutExt = originalName.replace(/\.(png|jpg|jpeg)$/i, "");
    const safeName = nameWithoutExt
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .substring(0, 50);
    
    // Use appId prefix to ensure uniqueness
    return `${appId.substring(0, 8)}-${safeName || "icon"}.webp`;
  } catch {
    // Fallback if URL parsing fails
    return `${appId.substring(0, 8)}-icon.webp`;
  }
}

/**
 * Save WebP file to disk
 */
async function saveWebPFile(buffer: Buffer, filename: string): Promise<string> {
  // Ensure upload directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const filePath = resolve(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);

  // Return relative URL path
  return `/uploads/icons/${filename}`;
}

/**
 * Convert a single app icon
 */
async function convertAppIcon(
  app: { id: string; name: string; iconUrl: string }
): Promise<ConversionResult> {
  const result: ConversionResult = {
    appId: app.id,
    appName: app.name,
    originalUrl: app.iconUrl,
    newUrl: null,
    success: false,
  };

  try {
    console.log(`\n📥 Downloading: ${app.name} (${app.iconUrl.substring(0, 60)}...)`);

    // Download image
    const imageBuffer = await downloadImage(app.iconUrl);
    if (!imageBuffer) {
      throw new Error("Download returned null");
    }

    console.log(`   ✓ Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`);

    // Convert to WebP
    console.log(`   🔄 Converting to WebP...`);
    const webpBuffer = await convertToWebP(imageBuffer);
    console.log(`   ✓ Converted to ${(webpBuffer.length / 1024).toFixed(1)}KB WebP`);

    // Save file (skip in dry-run)
    const filename = generateFilename(app.iconUrl, app.id);
    if (DRY_RUN) {
      result.newUrl = `/uploads/icons/${filename}`; // Simulated URL
      result.success = true;
      console.log(`   ✅ Would save to /uploads/icons/${filename} (DRY RUN)`);
    } else {
      const newUrl = await saveWebPFile(webpBuffer, filename);
      result.newUrl = newUrl;
      result.success = true;
      console.log(`   ✅ Saved to ${newUrl}`);
    }

    return result;
  } catch (error: any) {
    result.error = error.message || String(error);
    console.error(`   ❌ Error: ${result.error}`);
    return result;
  }
}

/**
 * Main migration function
 */
async function migrateIconsToWebP() {
  const startTime = Date.now();

  console.log("🚀 Starting icon migration to WebP...\n");
  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No files will be saved, no database updates\n");
  }
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🎨 WebP quality: ${WEBP_QUALITY}`);
  console.log(`⏱️  Timeout: ${DOWNLOAD_TIMEOUT / 1000}s\n`);

  try {
    // Fetch all apps with PNG/JPG icons
    console.log("📊 Fetching apps with PNG/JPG icons...");
    const apps = await db
      .select({
        id: MiniApp.id,
        name: MiniApp.name,
        iconUrl: MiniApp.iconUrl,
      })
      .from(MiniApp)
      .where(
        and(
          isNotNull(MiniApp.iconUrl),
          or(
            like(MiniApp.iconUrl, "%.png"),
            like(MiniApp.iconUrl, "%.jpg"),
            like(MiniApp.iconUrl, "%.jpeg"),
            like(MiniApp.iconUrl, "%PNG"),
            like(MiniApp.iconUrl, "%JPG"),
            like(MiniApp.iconUrl, "%JPEG")
          )
        )
      );

    console.log(`   Found ${apps.length} apps with PNG/JPG icons\n`);

    if (apps.length === 0) {
      console.log("✅ No apps to convert!");
      return;
    }

    // Process each app
    const results: ConversionResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      console.log(`\n[${i + 1}/${apps.length}] Processing: ${app.name}`);

      const result = await convertAppIcon(app);
      results.push(result);

      if (result.success) {
        successCount++;

        // Update database (skip in dry-run)
        if (DRY_RUN) {
          console.log(`   💾 Would update database (DRY RUN)`);
        } else {
          try {
            await db
              .update(MiniApp)
              .set({ iconUrl: result.newUrl! })
              .where(eq(MiniApp.id, result.appId));

            console.log(`   💾 Database updated`);
          } catch (dbError: any) {
            console.error(`   ⚠️  Database update failed: ${dbError.message}`);
            result.error = `Conversion succeeded but DB update failed: ${dbError.message}`;
            result.success = false;
            successCount--;
            failCount++;
          }
        }
      } else {
        failCount++;
      }

      // Small delay to avoid overwhelming the server
      if (i < apps.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total apps found:     ${apps.length}`);
    console.log(`✅ Successfully converted: ${successCount}`);
    console.log(`❌ Failed:            ${failCount}`);
    console.log(`⏱️  Time taken:        ${duration}s`);
    console.log("=".repeat(60));

    // Print failed apps
    if (failCount > 0) {
      console.log("\n❌ Failed conversions:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   - ${r.appName} (${r.appId.substring(0, 8)}...)`);
          console.log(`     URL: ${r.originalUrl.substring(0, 80)}...`);
          console.log(`     Error: ${r.error}`);
        });
    }

    // Verify no PNG/JPG URLs remain
    console.log("\n🔍 Verifying migration...");
    const remainingPngJpg = await db
      .select({ id: MiniApp.id, name: MiniApp.name, iconUrl: MiniApp.iconUrl })
      .from(MiniApp)
      .where(
        and(
          isNotNull(MiniApp.iconUrl),
          or(
            like(MiniApp.iconUrl, "%.png"),
            like(MiniApp.iconUrl, "%.jpg"),
            like(MiniApp.iconUrl, "%.jpeg"),
            like(MiniApp.iconUrl, "%PNG"),
            like(MiniApp.iconUrl, "%JPG"),
            like(MiniApp.iconUrl, "%JPEG")
          )
        )
      );

    if (remainingPngJpg.length > 0) {
      console.log(`⚠️  Warning: ${remainingPngJpg.length} apps still have PNG/JPG URLs:`);
      remainingPngJpg.forEach((app) => {
        console.log(`   - ${app.name}: ${app.iconUrl}`);
      });
    } else {
      console.log("✅ All PNG/JPG icons have been converted!");
    }

    console.log("\n✨ Migration complete!");
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateIconsToWebP()
  .then(() => {
    console.log("\n✅ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

