/**
 * Migration Script: Convert All PNG/JPG Images to WebP
 * 
 * This script converts:
 * 1. App icons (MiniApp.iconUrl)
 * 2. App header images (MiniApp.headerImageUrl)
 * 3. App screenshots (MiniApp.screenshots array)
 * 4. Developer avatars (Developer.avatar)
 * 
 * Usage:
 *   npx tsx scripts/convert-all-images-to-webp.ts
 *   npm run migrate:all-images-webp
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { MiniApp, Developer } from "../src/db/schema";
import { eq, or, like, and, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { resolve, basename } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Configuration
const UPLOAD_DIR = resolve(process.cwd(), "public", "uploads");
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
  type: "icon" | "header" | "screenshot" | "avatar";
  entityId: string;
  entityName: string;
  originalUrl: string;
  newUrl: string | null;
  success: boolean;
  error?: string;
  screenshotIndex?: number; // For screenshots array
}

interface ConversionStats {
  icons: { total: number; success: number; failed: number };
  headers: { total: number; success: number; failed: number };
  screenshots: { total: number; success: number; failed: number };
  avatars: { total: number; success: number; failed: number };
}

/**
 * Check if URL is PNG/JPG
 */
function isPngJpg(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg");
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
function generateFilename(originalUrl: string, entityId: string, type: string, index?: number): string {
  try {
    const url = new URL(originalUrl);
    const originalName = basename(url.pathname);
    const nameWithoutExt = originalName.replace(/\.(png|jpg|jpeg)$/i, "");
    const safeName = nameWithoutExt
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .substring(0, 40);
    
    const prefix = entityId.substring(0, 8);
    const suffix = index !== undefined ? `-screenshot-${index}` : `-${type}`;
    return `${prefix}-${safeName || type}${suffix}.webp`;
  } catch {
    // Fallback if URL parsing fails
    const prefix = entityId.substring(0, 8);
    const suffix = index !== undefined ? `-screenshot-${index}` : `-${type}`;
    return `${prefix}${suffix}.webp`;
  }
}

/**
 * Save WebP file to disk
 */
async function saveWebPFile(buffer: Buffer, filename: string, subfolder: string): Promise<string> {
  const folderPath = resolve(UPLOAD_DIR, subfolder);
  
  // Ensure upload directory exists
  if (!existsSync(folderPath)) {
    await mkdir(folderPath, { recursive: true });
  }

  const filePath = resolve(folderPath, filename);
  await writeFile(filePath, buffer);

  // Return relative URL path
  return `/uploads/${subfolder}/${filename}`;
}

/**
 * Convert a single image
 */
async function convertImage(
  url: string,
  entityId: string,
  entityName: string,
  type: "icon" | "header" | "screenshot" | "avatar",
  index?: number
): Promise<ConversionResult> {
  const result: ConversionResult = {
    type,
    entityId,
    entityName,
    originalUrl: url,
    newUrl: null,
    success: false,
    screenshotIndex: index,
  };

  try {
    const typeLabel = type === "screenshot" && index !== undefined 
      ? `${type} #${index + 1}` 
      : type;

    console.log(`\n📥 Downloading ${typeLabel}: ${entityName} (${url.substring(0, 60)}...)`);

    // Download image
    const imageBuffer = await downloadImage(url);
    if (!imageBuffer) {
      throw new Error("Download returned null");
    }

    console.log(`   ✓ Downloaded ${(imageBuffer.length / 1024).toFixed(1)}KB`);

    // Convert to WebP
    console.log(`   🔄 Converting to WebP...`);
    const webpBuffer = await convertToWebP(imageBuffer);
    console.log(`   ✓ Converted to ${(webpBuffer.length / 1024).toFixed(1)}KB WebP`);

    // Determine subfolder
    const subfolder = 
      type === "avatar" ? "avatars" : 
      type === "screenshot" ? "screenshots" : 
      type === "header" ? "headers" : 
      "icons";

    // Save file (skip in dry-run)
    const filename = generateFilename(url, entityId, type, index);
    if (DRY_RUN) {
      result.newUrl = `/uploads/${subfolder}/${filename}`; // Simulated URL
      result.success = true;
      console.log(`   ✅ Would save to /uploads/${subfolder}/${filename} (DRY RUN)`);
    } else {
      const newUrl = await saveWebPFile(webpBuffer, filename, subfolder);
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
async function migrateAllImagesToWebP() {
  const startTime = Date.now();
  const stats: ConversionStats = {
    icons: { total: 0, success: 0, failed: 0 },
    headers: { total: 0, success: 0, failed: 0 },
    screenshots: { total: 0, success: 0, failed: 0 },
    avatars: { total: 0, success: 0, failed: 0 },
  };

  console.log("🚀 Starting complete image migration to WebP...\n");
  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No files will be saved, no database updates\n");
  }
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`🎨 WebP quality: ${WEBP_QUALITY}`);
  console.log(`⏱️  Timeout: ${DOWNLOAD_TIMEOUT / 1000}s\n`);

  try {
    // ============================================================
    // 1. PROCESS APP ICONS
    // ============================================================
    console.log("=".repeat(60));
    console.log("📱 PROCESSING APP ICONS");
    console.log("=".repeat(60));
    
    const appsWithIcons = await db
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

    console.log(`Found ${appsWithIcons.length} apps with PNG/JPG icons\n`);
    stats.icons.total = appsWithIcons.length;

    for (let i = 0; i < appsWithIcons.length; i++) {
      const app = appsWithIcons[i];
      console.log(`[${i + 1}/${appsWithIcons.length}] Processing icon: ${app.name}`);

      const result = await convertImage(app.iconUrl, app.id, app.name, "icon");

      if (result.success && !DRY_RUN) {
        try {
          await db
            .update(MiniApp)
            .set({ iconUrl: result.newUrl! })
            .where(eq(MiniApp.id, result.entityId));
          console.log(`   💾 Database updated`);
          stats.icons.success++;
        } catch (dbError: any) {
          console.error(`   ⚠️  Database update failed: ${dbError.message}`);
          stats.icons.failed++;
        }
      } else if (result.success) {
        stats.icons.success++;
      } else {
        stats.icons.failed++;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ============================================================
    // 2. PROCESS APP HEADER IMAGES
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("🖼️  PROCESSING APP HEADER IMAGES");
    console.log("=".repeat(60));

    const appsWithHeaders = await db
      .select({
        id: MiniApp.id,
        name: MiniApp.name,
        headerImageUrl: MiniApp.headerImageUrl,
      })
      .from(MiniApp)
      .where(
        and(
          isNotNull(MiniApp.headerImageUrl),
          or(
            like(MiniApp.headerImageUrl, "%.png"),
            like(MiniApp.headerImageUrl, "%.jpg"),
            like(MiniApp.headerImageUrl, "%.jpeg"),
            like(MiniApp.headerImageUrl, "%PNG"),
            like(MiniApp.headerImageUrl, "%JPG"),
            like(MiniApp.headerImageUrl, "%JPEG")
          )
        )
      );

    console.log(`Found ${appsWithHeaders.length} apps with PNG/JPG header images\n`);
    stats.headers.total = appsWithHeaders.length;

    for (let i = 0; i < appsWithHeaders.length; i++) {
      const app = appsWithHeaders[i];
      if (!app.headerImageUrl) continue;

      console.log(`[${i + 1}/${appsWithHeaders.length}] Processing header: ${app.name}`);

      const result = await convertImage(app.headerImageUrl, app.id, app.name, "header");

      if (result.success && !DRY_RUN) {
        try {
          await db
            .update(MiniApp)
            .set({ headerImageUrl: result.newUrl! })
            .where(eq(MiniApp.id, result.entityId));
          console.log(`   💾 Database updated`);
          stats.headers.success++;
        } catch (dbError: any) {
          console.error(`   ⚠️  Database update failed: ${dbError.message}`);
          stats.headers.failed++;
        }
      } else if (result.success) {
        stats.headers.success++;
      } else {
        stats.headers.failed++;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ============================================================
    // 3. PROCESS APP SCREENSHOTS
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("📸 PROCESSING APP SCREENSHOTS");
    console.log("=".repeat(60));

    const allApps = await db
      .select({
        id: MiniApp.id,
        name: MiniApp.name,
        screenshots: MiniApp.screenshots,
      })
      .from(MiniApp)
      .where(isNotNull(MiniApp.screenshots));

    // Find apps with PNG/JPG screenshots
    const appsWithScreenshots: Array<{ id: string; name: string; screenshots: string[] }> = [];
    for (const app of allApps) {
      if (app.screenshots && Array.isArray(app.screenshots)) {
        const pngJpgScreenshots = app.screenshots.filter((url) => isPngJpg(url));
        if (pngJpgScreenshots.length > 0) {
          appsWithScreenshots.push({
            id: app.id,
            name: app.name,
            screenshots: pngJpgScreenshots,
          });
          stats.screenshots.total += pngJpgScreenshots.length;
        }
      }
    }

    console.log(`Found ${appsWithScreenshots.length} apps with PNG/JPG screenshots (${stats.screenshots.total} total screenshots)\n`);

    for (let i = 0; i < appsWithScreenshots.length; i++) {
      const app = appsWithScreenshots[i];
      console.log(`\n[${i + 1}/${appsWithScreenshots.length}] Processing screenshots: ${app.name} (${app.screenshots.length} screenshots)`);

      const convertedScreenshots: string[] = [];
      const originalScreenshots = app.screenshots;

      for (let j = 0; j < app.screenshots.length; j++) {
        const screenshotUrl = app.screenshots[j];
        if (!isPngJpg(screenshotUrl)) {
          // Keep non-PNG/JPG screenshots as-is
          convertedScreenshots.push(screenshotUrl);
          continue;
        }

        const result = await convertImage(screenshotUrl, app.id, app.name, "screenshot", j);

        if (result.success) {
          convertedScreenshots.push(result.newUrl!);
          stats.screenshots.success++;
        } else {
          // Keep original if conversion fails
          convertedScreenshots.push(screenshotUrl);
          stats.screenshots.failed++;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Update database with converted screenshots array
      if (!DRY_RUN && convertedScreenshots.length > 0) {
        try {
          await db
            .update(MiniApp)
            .set({ screenshots: convertedScreenshots })
            .where(eq(MiniApp.id, app.id));
          console.log(`   💾 Database updated with ${convertedScreenshots.length} screenshots`);
        } catch (dbError: any) {
          console.error(`   ⚠️  Database update failed: ${dbError.message}`);
        }
      } else if (DRY_RUN) {
        console.log(`   💾 Would update database with ${convertedScreenshots.length} screenshots (DRY RUN)`);
      }
    }

    // ============================================================
    // 4. PROCESS DEVELOPER AVATARS
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("👤 PROCESSING DEVELOPER AVATARS");
    console.log("=".repeat(60));

    const developersWithAvatars = await db
      .select({
        id: Developer.id,
        name: Developer.name,
        wallet: Developer.wallet,
        avatar: Developer.avatar,
      })
      .from(Developer)
      .where(
        and(
          isNotNull(Developer.avatar),
          or(
            like(Developer.avatar, "%.png"),
            like(Developer.avatar, "%.jpg"),
            like(Developer.avatar, "%.jpeg"),
            like(Developer.avatar, "%PNG"),
            like(Developer.avatar, "%JPG"),
            like(Developer.avatar, "%JPEG")
          )
        )
      );

    console.log(`Found ${developersWithAvatars.length} developers with PNG/JPG avatars\n`);
    stats.avatars.total = developersWithAvatars.length;

    for (let i = 0; i < developersWithAvatars.length; i++) {
      const dev = developersWithAvatars[i];
      if (!dev.avatar) continue;

      const displayName = dev.name || dev.wallet.substring(0, 8) + "...";
      console.log(`[${i + 1}/${developersWithAvatars.length}] Processing avatar: ${displayName}`);

      const result = await convertImage(dev.avatar, dev.id, displayName, "avatar");

      if (result.success && !DRY_RUN) {
        try {
          await db
            .update(Developer)
            .set({ avatar: result.newUrl! })
            .where(eq(Developer.id, result.entityId));
          console.log(`   💾 Database updated`);
          stats.avatars.success++;
        } catch (dbError: any) {
          console.error(`   ⚠️  Database update failed: ${dbError.message}`);
          stats.avatars.failed++;
        }
      } else if (result.success) {
        stats.avatars.success++;
      } else {
        stats.avatars.failed++;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`\n📱 APP ICONS:`);
    console.log(`   Total:     ${stats.icons.total}`);
    console.log(`   ✅ Success: ${stats.icons.success}`);
    console.log(`   ❌ Failed:  ${stats.icons.failed}`);
    console.log(`\n🖼️  HEADER IMAGES:`);
    console.log(`   Total:     ${stats.headers.total}`);
    console.log(`   ✅ Success: ${stats.headers.success}`);
    console.log(`   ❌ Failed:  ${stats.headers.failed}`);
    console.log(`\n📸 SCREENSHOTS:`);
    console.log(`   Total:     ${stats.screenshots.total}`);
    console.log(`   ✅ Success: ${stats.screenshots.success}`);
    console.log(`   ❌ Failed:  ${stats.screenshots.failed}`);
    console.log(`\n👤 DEVELOPER AVATARS:`);
    console.log(`   Total:     ${stats.avatars.total}`);
    console.log(`   ✅ Success: ${stats.avatars.success}`);
    console.log(`   ❌ Failed:  ${stats.avatars.failed}`);
    console.log(`\n⏱️  Time taken: ${duration}s`);
    console.log("=".repeat(60));

    // ============================================================
    // VERIFICATION
    // ============================================================
    console.log("\n🔍 Verifying migration...");

    // Check icons
    const remainingIcons = await db
      .select({ id: MiniApp.id, name: MiniApp.name, iconUrl: MiniApp.iconUrl })
      .from(MiniApp)
      .where(
        and(
          isNotNull(MiniApp.iconUrl),
          or(
            like(MiniApp.iconUrl, "%.png"),
            like(MiniApp.iconUrl, "%.jpg"),
            like(MiniApp.iconUrl, "%.jpeg")
          )
        )
      );

    // Check headers
    const remainingHeaders = await db
      .select({ id: MiniApp.id, name: MiniApp.name, headerImageUrl: MiniApp.headerImageUrl })
      .from(MiniApp)
      .where(
        and(
          isNotNull(MiniApp.headerImageUrl),
          or(
            like(MiniApp.headerImageUrl, "%.png"),
            like(MiniApp.headerImageUrl, "%.jpg"),
            like(MiniApp.headerImageUrl, "%.jpeg")
          )
        )
      );

    // Check avatars
    const remainingAvatars = await db
      .select({ id: Developer.id, name: Developer.name, avatar: Developer.avatar })
      .from(Developer)
      .where(
        and(
          isNotNull(Developer.avatar),
          or(
            like(Developer.avatar, "%.png"),
            like(Developer.avatar, "%.jpg"),
            like(Developer.avatar, "%.jpeg")
          )
        )
      );

    // Check screenshots
    const allAppsAfter = await db
      .select({ id: MiniApp.id, name: MiniApp.name, screenshots: MiniApp.screenshots })
      .from(MiniApp)
      .where(isNotNull(MiniApp.screenshots));

    let remainingScreenshots = 0;
    for (const app of allAppsAfter) {
      if (app.screenshots && Array.isArray(app.screenshots)) {
        remainingScreenshots += app.screenshots.filter((url) => isPngJpg(url)).length;
      }
    }

    if (remainingIcons.length > 0 || remainingHeaders.length > 0 || remainingAvatars.length > 0 || remainingScreenshots > 0) {
      console.log(`⚠️  Warning: Some PNG/JPG images remain:`);
      if (remainingIcons.length > 0) {
        console.log(`   - ${remainingIcons.length} app icons`);
      }
      if (remainingHeaders.length > 0) {
        console.log(`   - ${remainingHeaders.length} header images`);
      }
      if (remainingAvatars.length > 0) {
        console.log(`   - ${remainingAvatars.length} developer avatars`);
      }
      if (remainingScreenshots > 0) {
        console.log(`   - ${remainingScreenshots} screenshots`);
      }
    } else {
      console.log("✅ All PNG/JPG images have been converted!");
    }

    console.log("\n✨ Migration complete!");
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrateAllImagesToWebP()
  .then(() => {
    console.log("\n✅ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

