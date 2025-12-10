/**
 * Script to convert static PNG files in public folder to WebP
 * 
 * This script:
 * 1. Finds all PNG files in the public directory
 * 2. Converts them to WebP using sharp
 * 3. Keeps the original PNG files (for fallback)
 * 
 * Usage:
 *   npx tsx scripts/convert-static-pngs-to-webp.ts
 */

import sharp from "sharp";
import { readdir, stat, readFile, writeFile } from "fs/promises";
import { resolve, join, extname } from "path";
import { existsSync } from "fs";

const PUBLIC_DIR = resolve(process.cwd(), "public");
const WEBP_QUALITY = 85;

interface ConversionResult {
  file: string;
  originalSize: number;
  webpSize: number;
  success: boolean;
  error?: string;
}

/**
 * Recursively find all PNG files in a directory
 */
async function findPngFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        await findPngFiles(filePath, fileList);
      }
    } else if (extname(file).toLowerCase() === '.png') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Convert a PNG file to WebP
 */
async function convertToWebP(pngPath: string): Promise<ConversionResult> {
  const result: ConversionResult = {
    file: pngPath,
    originalSize: 0,
    webpSize: 0,
    success: false,
  };

  try {
    // Read the PNG file
    const pngBuffer = await readFile(pngPath);
    result.originalSize = pngBuffer.length;

    // Convert to WebP
    const webpBuffer = await sharp(pngBuffer)
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    result.webpSize = webpBuffer.length;

    // Write WebP file (replace .png with .webp)
    const webpPath = pngPath.replace(/\.png$/i, '.webp');
    await writeFile(webpPath, webpBuffer);

    result.success = true;
    
    const savings = ((1 - result.webpSize / result.originalSize) * 100).toFixed(1);
    console.log(`✅ ${pngPath}`);
    console.log(`   Original: ${(result.originalSize / 1024).toFixed(1)}KB → WebP: ${(result.webpSize / 1024).toFixed(1)}KB (${savings}% smaller)`);
    
    return result;
  } catch (error: any) {
    result.error = error.message || String(error);
    console.error(`❌ ${pngPath}: ${result.error}`);
    return result;
  }
}

/**
 * Main function
 */
async function convertStaticPngsToWebP() {
  console.log("🚀 Starting conversion of static PNG files to WebP...\n");
  console.log(`📁 Public directory: ${PUBLIC_DIR}`);
  console.log(`🎨 WebP quality: ${WEBP_QUALITY}\n`);

  if (!existsSync(PUBLIC_DIR)) {
    console.error(`❌ Public directory not found: ${PUBLIC_DIR}`);
    process.exit(1);
  }

  try {
    // Find all PNG files
    console.log("🔍 Searching for PNG files...");
    const pngFiles = await findPngFiles(PUBLIC_DIR);
    
    if (pngFiles.length === 0) {
      console.log("✅ No PNG files found to convert!");
      return;
    }

    console.log(`Found ${pngFiles.length} PNG file(s)\n`);

    // Convert each file
    const results: ConversionResult[] = [];
    let totalOriginalSize = 0;
    let totalWebpSize = 0;
    let successCount = 0;
    let failCount = 0;

    for (const pngFile of pngFiles) {
      const result = await convertToWebP(pngFile);
      results.push(result);
      
      if (result.success) {
        totalOriginalSize += result.originalSize;
        totalWebpSize += result.webpSize;
        successCount++;
      } else {
        failCount++;
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 CONVERSION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total files:     ${pngFiles.length}`);
    console.log(`✅ Success:      ${successCount}`);
    console.log(`❌ Failed:        ${failCount}`);
    console.log(`\n📦 Size reduction:`);
    console.log(`   Original:     ${(totalOriginalSize / 1024).toFixed(1)}KB`);
    console.log(`   WebP:         ${(totalWebpSize / 1024).toFixed(1)}KB`);
    console.log(`   Savings:      ${((1 - totalWebpSize / totalOriginalSize) * 100).toFixed(1)}%`);
    console.log(`   Saved:        ${((totalOriginalSize - totalWebpSize) / 1024).toFixed(1)}KB`);
    console.log("=".repeat(60));

    if (failCount > 0) {
      console.log("\n❌ Failed conversions:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`   - ${r.file}`);
          console.log(`     Error: ${r.error}`);
        });
    }

    console.log("\n✨ Conversion complete!");
    console.log("\n💡 Note: Original PNG files are kept for fallback.");
    console.log("   Update your code to use .webp extensions where possible.");
  } catch (error: any) {
    console.error("\n❌ Conversion failed:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run conversion
convertStaticPngsToWebP()
  .then(() => {
    console.log("\n✅ Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

