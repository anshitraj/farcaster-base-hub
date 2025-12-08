/**
 * Migrate /uploads URLs to Vercel Blob
 * This script fetches original images and uploads them to Vercel Blob
 */

import { db } from "../src/lib/db";
import { MiniApp } from "../src/db/schema";
import { sql, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import sharp from "sharp";

async function migrateUploadsToBlob() {
  console.log("🔄 Starting migration of /uploads URLs to Vercel Blob...\n");

  try {
    // Find all apps with /uploads URLs
    const appsWithUploads = await db
      .select()
      .from(MiniApp)
      .where(
        sql`${MiniApp.iconUrl} LIKE '/uploads/%' OR ${MiniApp.headerImageUrl} LIKE '/uploads/%'`
      )
      .limit(100); // Process in batches

    console.log(`📦 Found ${appsWithUploads.length} apps with /uploads URLs\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const app of appsWithUploads) {
      console.log(`\n🔄 Processing: ${app.name}`);

      try {
        let newIconUrl = app.iconUrl;
        let newHeaderUrl = app.headerImageUrl;

        // Try to get original URLs from farcasterJson
        if (app.farcasterJson) {
          const farcasterData = JSON.parse(app.farcasterJson);
          
          // Process icon
          if (app.iconUrl?.startsWith("/uploads") && farcasterData.imageUrl) {
            console.log(`  📥 Fetching icon from: ${farcasterData.imageUrl}`);
            try {
              const iconResponse = await fetch(farcasterData.imageUrl);
              if (iconResponse.ok) {
                const buffer = Buffer.from(await iconResponse.arrayBuffer());
                
                // Convert to WebP
                const webpBuffer = await sharp(buffer)
                  .webp({ quality: 75 })
                  .toBuffer();

                // Upload to Vercel Blob
                const filename = `icons/${app.id}-icon.webp`;
                const blob = await put(filename, webpBuffer, {
                  access: "public",
                  contentType: "image/webp",
                });

                newIconUrl = blob.url;
                console.log(`  ✅ Icon uploaded to Blob: ${blob.url}`);
              }
            } catch (iconError) {
              console.error(`  ❌ Failed to process icon:`, iconError);
            }
          }

          // Process header
          if (app.headerImageUrl?.startsWith("/uploads") && farcasterData.splashImageUrl) {
            console.log(`  📥 Fetching header from: ${farcasterData.splashImageUrl}`);
            try {
              const headerResponse = await fetch(farcasterData.splashImageUrl);
              if (headerResponse.ok) {
                const buffer = Buffer.from(await headerResponse.arrayBuffer());
                
                // Convert to WebP
                const webpBuffer = await sharp(buffer)
                  .webp({ quality: 75 })
                  .toBuffer();

                // Upload to Vercel Blob
                const filename = `headers/${app.id}-header.webp`;
                const blob = await put(filename, webpBuffer, {
                  access: "public",
                  contentType: "image/webp",
                });

                newHeaderUrl = blob.url;
                console.log(`  ✅ Header uploaded to Blob: ${blob.url}`);
              }
            } catch (headerError) {
              console.error(`  ❌ Failed to process header:`, headerError);
            }
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
        }
      } catch (appError) {
        console.error(`  ❌ Error processing app:`, appError);
        errorCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
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

