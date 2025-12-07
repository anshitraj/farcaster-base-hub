/**
 * Cleanup Script: Remove Apps with PNG/JPG Images
 * 
 * This script:
 * 1. Finds all apps with PNG/JPG images (icons, headers, screenshots)
 * 2. Attempts to convert them to WebP
 * 3. If conversion fails or image is inaccessible, removes the app
 * 4. Logs removed apps so they can be re-added cleanly
 * 
 * Usage:
 *   npx tsx scripts/cleanup-png-images.ts
 *   npm run cleanup:png-images
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { MiniApp, Developer } from "../src/db/schema";
import { eq, or, like, and, isNotNull } from "drizzle-orm";
import { convertImageUrlToWebP } from "@/lib/image-optimization";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Check for dry-run mode
const DRY_RUN = process.argv.includes("--dry-run") || process.argv.includes("-d");

// Initialize database connection
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

interface RemovedApp {
  id: string;
  name: string;
  url: string;
  reason: string;
  iconUrl?: string;
  headerImageUrl?: string;
  screenshots?: string[];
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
 * Attempt to convert an image URL to WebP
 */
async function tryConvertImage(imageUrl: string): Promise<boolean> {
  try {
    const webpBuffer = await convertImageUrlToWebP(imageUrl, 75);
    return webpBuffer !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Main cleanup function
 */
async function cleanupPngImages() {
  const startTime = Date.now();
  const removedApps: RemovedApp[] = [];

  console.log("🧹 Starting PNG image cleanup...\n");
  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No apps will be removed\n");
  }

  try {
    // Fetch all apps
    const allApps = await db
      .select({
        id: MiniApp.id,
        name: MiniApp.name,
        url: MiniApp.url,
        iconUrl: MiniApp.iconUrl,
        headerImageUrl: MiniApp.headerImageUrl,
        screenshots: MiniApp.screenshots,
      })
      .from(MiniApp);

    console.log(`📊 Found ${allApps.length} total apps\n`);

    // Find apps with PNG/JPG images
    const appsWithPngJpg = allApps.filter((app) => {
      const hasPngIcon = isPngJpg(app.iconUrl);
      const hasPngHeader = isPngJpg(app.headerImageUrl);
      const hasPngScreenshots = app.screenshots?.some((url) => isPngJpg(url));
      return hasPngIcon || hasPngHeader || hasPngScreenshots;
    });

    console.log(`🔍 Found ${appsWithPngJpg.length} apps with PNG/JPG images\n`);

    if (appsWithPngJpg.length === 0) {
      console.log("✅ No apps with PNG/JPG images found!");
      return;
    }

    // Process each app
    for (let i = 0; i < appsWithPngJpg.length; i++) {
      const app = appsWithPngJpg[i];
      console.log(`\n[${i + 1}/${appsWithPngJpg.length}] Processing: ${app.name}`);

      let shouldRemove = false;
      const reasons: string[] = [];

      // Check icon
      if (app.iconUrl && isPngJpg(app.iconUrl)) {
        console.log(`   📥 Checking icon: ${app.iconUrl.substring(0, 60)}...`);
        const canConvert = await tryConvertImage(app.iconUrl);
        if (!canConvert) {
          shouldRemove = true;
          reasons.push(`Icon conversion failed: ${app.iconUrl}`);
          console.log(`   ❌ Icon conversion failed`);
        } else {
          console.log(`   ✅ Icon can be converted`);
        }
      }

      // Check header
      if (app.headerImageUrl && isPngJpg(app.headerImageUrl)) {
        console.log(`   📥 Checking header: ${app.headerImageUrl.substring(0, 60)}...`);
        const canConvert = await tryConvertImage(app.headerImageUrl);
        if (!canConvert) {
          shouldRemove = true;
          reasons.push(`Header conversion failed: ${app.headerImageUrl}`);
          console.log(`   ❌ Header conversion failed`);
        } else {
          console.log(`   ✅ Header can be converted`);
        }
      }

      // Check screenshots
      if (app.screenshots && app.screenshots.length > 0) {
        const pngScreenshots = app.screenshots.filter((url) => isPngJpg(url));
        if (pngScreenshots.length > 0) {
          console.log(`   📥 Checking ${pngScreenshots.length} PNG screenshots...`);
          let allScreenshotsOk = true;
          for (const screenshot of pngScreenshots) {
            const canConvert = await tryConvertImage(screenshot);
            if (!canConvert) {
              allScreenshotsOk = false;
              reasons.push(`Screenshot conversion failed: ${screenshot}`);
            }
          }
          if (!allScreenshotsOk) {
            shouldRemove = true;
            console.log(`   ❌ Some screenshots cannot be converted`);
          } else {
            console.log(`   ✅ All screenshots can be converted`);
          }
        }
      }

      // Remove app if conversion failed
      if (shouldRemove) {
        console.log(`   🗑️  Marking for removal: ${reasons.join(", ")}`);
        
        removedApps.push({
          id: app.id,
          name: app.name,
          url: app.url,
          reason: reasons.join("; "),
          iconUrl: app.iconUrl || undefined,
          headerImageUrl: app.headerImageUrl || undefined,
          screenshots: app.screenshots || undefined,
        });

        if (!DRY_RUN) {
          try {
            await db.delete(MiniApp).where(eq(MiniApp.id, app.id));
            console.log(`   ✅ App removed from database`);
          } catch (error: any) {
            console.error(`   ⚠️  Failed to remove app: ${error.message}`);
          }
        } else {
          console.log(`   💾 Would remove app (DRY RUN)`);
        }
      } else {
        console.log(`   ✅ App can be converted - keeping it`);
      }

      // Small delay to avoid overwhelming the server
      if (i < appsWithPngJpg.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total apps checked:     ${allApps.length}`);
    console.log(`Apps with PNG/JPG:      ${appsWithPngJpg.length}`);
    console.log(`✅ Apps kept:           ${appsWithPngJpg.length - removedApps.length}`);
    console.log(`🗑️  Apps removed:        ${removedApps.length}`);
    console.log(`⏱️  Time taken:          ${duration}s`);
    console.log("=".repeat(60));

    // Print removed apps
    if (removedApps.length > 0) {
      console.log("\n🗑️  REMOVED APPS (can be re-added):");
      console.log("=".repeat(60));
      removedApps.forEach((app, index) => {
        console.log(`\n${index + 1}. ${app.name}`);
        console.log(`   ID: ${app.id}`);
        console.log(`   URL: ${app.url}`);
        console.log(`   Reason: ${app.reason}`);
        if (app.iconUrl) console.log(`   Icon: ${app.iconUrl}`);
        if (app.headerImageUrl) console.log(`   Header: ${app.headerImageUrl}`);
        if (app.screenshots && app.screenshots.length > 0) {
          console.log(`   Screenshots: ${app.screenshots.length}`);
        }
      });
      console.log("\n" + "=".repeat(60));
      console.log("💡 TIP: Re-add these apps with WebP images for better performance");
    }

    // Verify cleanup
    console.log("\n🔍 Verifying cleanup...");
    const remainingPngJpg = await db
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

    if (remainingPngJpg.length > 0) {
      console.log(`⚠️  Warning: ${remainingPngJpg.length} apps still have PNG/JPG icons:`);
      remainingPngJpg.forEach((app) => {
        console.log(`   - ${app.name}: ${app.iconUrl}`);
      });
    } else {
      console.log("✅ All PNG/JPG icons have been cleaned up!");
    }

    console.log("\n✨ Cleanup complete!");
  } catch (error: any) {
    console.error("\n❌ Cleanup failed:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run cleanup
cleanupPngImages()
  .then(() => {
    console.log("\n✅ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

