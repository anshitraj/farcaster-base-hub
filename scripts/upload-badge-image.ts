/**
 * Upload castyourapptransparent.webp to Vercel Blob Storage
 * This ensures the badge image is available in production
 */

// Load environment variables FIRST
require("dotenv").config({ path: require("path").resolve(process.cwd(), ".env.local") });

import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import { join } from "path";

async function uploadBadgeImage() {
  console.log("🔄 Uploading castyourapptransparent.webp to Vercel Blob Storage...\n");

  try {
    // Read the badge file from public/badges folder
    const filePath = join(process.cwd(), "public", "badges", "castyourapptransparent.webp");
    const buffer = await readFile(filePath);

    console.log(`📥 Read file: ${filePath} (${buffer.length} bytes)`);

    // Upload to Vercel Blob Storage
    const blobPath = `badges/castyourapptransparent.webp`;
    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "image/webp",
    });

    console.log(`\n✅ Badge image uploaded successfully!`);
    console.log(`   Blob URL: ${blob.url}`);
    console.log(`\n📝 Update your code to use this URL:`);
    console.log(`   ${blob.url}`);
    console.log(`\n   Or set it as an environment variable:`);
    console.log(`   NEXT_PUBLIC_CAST_BADGE_IMAGE_URL="${blob.url}"`);

    return blob.url;
  } catch (error: any) {
    console.error("\n❌ Error uploading badge image:", error.message);
    if (error.message.includes("BLOB_READ_WRITE_TOKEN")) {
      console.error("\n💡 Make sure BLOB_READ_WRITE_TOKEN is set in your .env.local file");
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  uploadBadgeImage()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { uploadBadgeImage };

