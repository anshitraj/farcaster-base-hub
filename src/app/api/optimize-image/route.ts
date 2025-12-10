import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// Cache optimized image URLs in memory (simple cache)
const imageCache = new Map<string, string>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Check if Vercel Blob is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("BLOB_READ_WRITE_TOKEN not configured, returning original URL");
      return NextResponse.json({
        optimizedUrl: imageUrl,
        fallback: true,
        reason: "Vercel Blob not configured",
      });
    }

    // Check cache first
    if (imageCache.has(imageUrl)) {
      return NextResponse.json({
        optimizedUrl: imageCache.get(imageUrl),
        cached: true,
      });
    }

    try {
      // Fetch the original image
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);

      // Convert to WebP with optimization
      const webpBuffer = await sharp(buffer)
        .webp({ 
          quality: 80,
          effort: 6,
        })
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      // Generate a unique filename
      const urlHash = Buffer.from(imageUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
      const filename = `optimized-${urlHash}-${Date.now()}.webp`;

      // Upload to Vercel Blob
      const blob = await put(filename, webpBuffer, {
        access: 'public',
        contentType: 'image/webp',
        addRandomSuffix: false,
      });

      // Cache the result
      imageCache.set(imageUrl, blob.url);

      return NextResponse.json({
        optimizedUrl: blob.url,
        cached: false,
      });
    } catch (error: any) {
      console.error("Error optimizing image:", error);
      // Return original URL if optimization fails
      return NextResponse.json({
        optimizedUrl: imageUrl,
        error: error.message,
        fallback: true,
      });
    }
  } catch (error: any) {
    console.error("Error in optimize-image route:", error);
    return NextResponse.json(
      { error: "Failed to optimize image", details: error.message },
      { status: 500 }
    );
  }
}

