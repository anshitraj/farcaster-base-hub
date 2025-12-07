/**
 * API Route: /api/icon
 * 
 * Serves optimized WebP images for app icons
 * - Fetches the original image from database or URL
 * - Converts PNG/JPG to WebP if needed
 * - Returns WebP with proper cache headers
 * 
 * Usage:
 *   /api/icon?id={appId} - Get icon by app ID
 *   /api/icon?url={imageUrl} - Get icon by direct URL
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";
import { convertImageUrlToWebP, convertToWebP } from "@/lib/image-optimization";
import sharp from "sharp";

export const runtime = "nodejs"; // sharp requires Node.js runtime
export const dynamic = "force-dynamic";

const CACHE_MAX_AGE = 86400; // 24 hours

async function fetchAndConvertImage(imageUrl: string): Promise<Buffer | null> {
  try {
    // Check if it's a local file
    if (imageUrl.startsWith("/")) {
      // Local file - read from filesystem
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", imageUrl);
      
      try {
        const buffer = await fs.readFile(filePath);
        // Convert to WebP if needed
        return await convertToWebP(buffer, 75);
      } catch (error) {
        // Silently fail for local files - will use placeholder
        return null;
      }
    }

    // External URL - fetch and convert with better error handling
    try {
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MiniAppStore/1.0)",
        },
        signal: AbortSignal.timeout(5000), // Reduced to 5 second timeout
      });

      if (!response.ok) {
        // Silently fail - will use placeholder instead of logging error
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Check if already WebP
      try {
        const metadata = await sharp(buffer).metadata();
        if (metadata.format === "webp") {
          return buffer; // Already WebP
        }
      } catch {
        // If metadata check fails, try conversion anyway
      }

      // Convert to WebP
      return await convertToWebP(buffer, 75);
    } catch (fetchError: any) {
      // Silently handle fetch errors (network issues, timeouts, etc.)
      // Don't log to avoid cluttering console with upstream errors
      return null;
    }
  } catch (error: any) {
    // Silently handle all other errors
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const appId = searchParams.get("id");
    const imageUrl = searchParams.get("url");

    let iconUrl: string | null = null;

    // Get icon URL from app ID or direct URL
    if (appId) {
      const apps = await db
        .select({ iconUrl: MiniApp.iconUrl })
        .from(MiniApp)
        .where(eq(MiniApp.id, appId))
        .limit(1);

      if (apps.length === 0) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }

      iconUrl = apps[0].iconUrl;
    } else if (imageUrl) {
      iconUrl = decodeURIComponent(imageUrl);
    } else {
      return NextResponse.json(
        { error: "Missing 'id' or 'url' parameter" },
        { status: 400 }
      );
    }

    if (!iconUrl) {
      return NextResponse.json(
        { error: "No icon URL found" },
        { status: 404 }
      );
    }

    // Fetch and convert image
    const webpBuffer = await fetchAndConvertImage(iconUrl);

    if (!webpBuffer) {
      // Return placeholder if conversion fails (silently handle upstream errors)
      const fs = await import("fs/promises");
      const path = await import("path");
      try {
        // Try placeholder-icon.png first, fallback to placeholder.svg
        let placeholderPath = path.join(process.cwd(), "public", "placeholder-icon.png");
        try {
          const placeholderBuffer = await fs.readFile(placeholderPath);
          const webpPlaceholder = await convertToWebP(placeholderBuffer, 75);
          
          return new NextResponse(webpPlaceholder, {
            headers: {
              "Content-Type": "image/webp",
              "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
            },
          });
        } catch {
          // Fallback to placeholder.svg
          placeholderPath = path.join(process.cwd(), "public", "placeholder.svg");
          const placeholderBuffer = await fs.readFile(placeholderPath);
          const webpPlaceholder = await convertToWebP(placeholderBuffer, 75);
          
          return new NextResponse(webpPlaceholder, {
            headers: {
              "Content-Type": "image/webp",
              "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
            },
          });
        }
      } catch {
        // Last resort: return a simple 1x1 transparent PNG
        const transparentPng = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        );
        return new NextResponse(transparentPng, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
          },
        });
      }
    }

    // Return WebP image with cache headers
    return new NextResponse(webpBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, immutable`,
      },
    });
  } catch (error: any) {
    // Silently handle errors and return placeholder instead of error response
    // This prevents upstream errors from propagating to the client
    const fs = await import("fs/promises");
    const path = await import("path");
    try {
      const placeholderPath = path.join(process.cwd(), "public", "placeholder.svg");
      const placeholderBuffer = await fs.readFile(placeholderPath);
      const webpPlaceholder = await convertToWebP(placeholderBuffer, 75);
      
      return new NextResponse(webpPlaceholder, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": `public, max-age=${CACHE_MAX_AGE}`,
        },
      });
    } catch {
      // Return transparent PNG as last resort
      const transparentPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      return new NextResponse(transparentPng, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": `public, max-age=3600`,
        },
      });
    }
  }
}

