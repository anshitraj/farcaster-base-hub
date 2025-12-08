import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Runtime configuration for Vercel serverless
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPlaceholder(): Promise<Response> {
  try {
    const placeholderPath = join(process.cwd(), "public", "placeholder.svg");
    const buffer = await readFile(placeholderPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    // Fallback: return a simple transparent PNG if placeholder.svg doesn't exist
    const transparentPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    return new Response(transparentPng, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");

  if (!target) {
    return getPlaceholder();
  }

  try {
    // Handle local paths (starting with /)
    if (target.startsWith("/")) {
      try {
        // For /uploads files, try to read from public folder first
        // In production, these might not exist if not committed to git
        const filePath = join(process.cwd(), "public", target);
        const buffer = await readFile(filePath);
        
        // Determine content type from file extension
        let contentType = "image/png";
        if (target.endsWith(".svg")) contentType = "image/svg+xml";
        else if (target.endsWith(".webp")) contentType = "image/webp";
        else if (target.endsWith(".jpg") || target.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (target.endsWith(".gif")) contentType = "image/gif";
        
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        // File doesn't exist locally
        // For /uploads paths, they might be in Vercel Blob or just missing
        // Return placeholder immediately to avoid 404 errors
        // This prevents Next.js Image from trying to optimize a non-existent file
        if (target.startsWith("/uploads")) {
          // Silently return placeholder for missing /uploads files
          // This is expected in production where old /uploads paths don't exist
          return getPlaceholder();
        }
        
        // For other local paths, log the error
        console.error(`[api/icon] File not found: ${target}`);
        return getPlaceholder();
      }
    }

    // Handle external URLs - proxy them through this route
    // This is mainly for /uploads paths that might not exist
    try {
      const response = await fetch(target, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MiniAppStore/1.0)",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        console.error(`[api/icon] Failed to fetch external image: ${target} - Status: ${response.status}`);
        return getPlaceholder();
      }

      const blob = await response.blob();
      return new Response(blob, {
        headers: {
          "Content-Type": response.headers.get("content-type") || "image/png",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (fetchError) {
      console.error(`[api/icon] Error fetching external image: ${target}`, fetchError);
      return getPlaceholder();
    }
  } catch (e) {
    console.error(`[api/icon] Unexpected error:`, e);
    return getPlaceholder();
  }
}

