import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

async function getPlaceholder(): Promise<Response> {
  try {
    const placeholderPath = join(process.cwd(), "public", "placeholder.svg");
    const buffer = await readFile(placeholderPath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
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
          },
        });
      } catch {
        // File doesn't exist, return placeholder
        return getPlaceholder();
      }
    }

    // Handle external URLs
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MiniAppStore/1.0)",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return getPlaceholder();
    }

    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return getPlaceholder();
  }
}

