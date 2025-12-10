/**
 * Pre-optimize and upload popular card background images to Vercel Blob
 * Run this script before deploying to production to ensure images are ready
 */

import { put } from "@vercel/blob";
import sharp from "sharp";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const backgroundImages = [
  "/category-bg/game-bg.webp",
  "/category-bg/social-bg.webp",
  "/category-bg/shopping-bg.webp",
  "/category-bg/finance-bg.webp",
  "/category-bg/utility-bg.webp",
  "/category-bg/tech-bg.webp",
  "/category-bg/entertainment-bg.webp",
  "/category-bg/news-bg.webp",
  "/category-bg/art-bg.webp",
  "/category-bg/tools-bg.webp",
];

async function optimizeAndUpload(imagePath: string) {
  try {
    const publicPath = join(process.cwd(), "public", imagePath);
    
    if (!existsSync(publicPath)) {
      console.warn(`⚠️  Image not found: ${publicPath}`);
      return null;
    }

    console.log(`📸 Processing: ${imagePath}`);

    // Read the image file
    const imageBuffer = await readFile(publicPath);
    
    // Check if already WebP
    let webpBuffer: Buffer;
    if (imagePath.endsWith('.webp')) {
      // Already WebP, just optimize it
      webpBuffer = await sharp(imageBuffer)
        .webp({ 
          quality: 80,
          effort: 6,
        })
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
    } else {
      // Convert to WebP
      webpBuffer = await sharp(imageBuffer)
        .webp({ 
          quality: 80,
          effort: 6,
        })
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();
    }

    // Generate filename
    const filename = imagePath.replace(/^\//, '').replace(/\//g, '-').replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
    const blobFilename = `category-bg/${filename}`;

    // Upload to Vercel Blob
    const blob = await put(blobFilename, webpBuffer, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });

    console.log(`✅ Uploaded: ${blob.url}`);
    return blob.url;
  } catch (error: any) {
    console.error(`❌ Error processing ${imagePath}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Starting image pre-optimization...\n");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ BLOB_READ_WRITE_TOKEN environment variable is not set!");
    console.error("   Please set it in your .env.local file or environment variables.");
    process.exit(1);
  }

  const results: Record<string, string | null> = {};

  for (const imagePath of backgroundImages) {
    const optimizedUrl = await optimizeAndUpload(imagePath);
    results[imagePath] = optimizedUrl;
  }

  console.log("\n📊 Summary:");
  console.log("=".repeat(50));
  
  let successCount = 0;
  let failCount = 0;

  for (const [path, url] of Object.entries(results)) {
    if (url) {
      console.log(`✅ ${path} → ${url}`);
      successCount++;
    } else {
      console.log(`❌ ${path} → Failed`);
      failCount++;
    }
  }

  console.log("=".repeat(50));
  console.log(`\n✨ Completed: ${successCount} successful, ${failCount} failed`);

  if (failCount > 0) {
    console.warn("\n⚠️  Some images failed to upload. Check the errors above.");
    process.exit(1);
  }

  console.log("\n🎉 All images successfully uploaded to Vercel Blob!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

