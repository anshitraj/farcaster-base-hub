import { NextRequest, NextResponse } from "next/server";
import { convertImageUrlToWebP } from "@/lib/image-optimization";

// Note: sharp requires Node.js runtime, not Edge Runtime
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

/**
 * Image Optimization API Route
 * Converts PNG/JPG images to WebP format on-the-fly
 * 
 * Usage: /api/image/optimize?url=<image-url>&quality=75
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");
    const quality = parseInt(searchParams.get("quality") || "75", 10);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid image URL" },
        { status: 400 }
      );
    }

    // Convert to WebP
    const webpBuffer = await convertImageUrlToWebP(imageUrl, quality);

    if (!webpBuffer) {
      // If conversion fails, redirect to original image
      return NextResponse.redirect(imageUrl, { status: 302 });
    }

    // Return optimized WebP image
    return new NextResponse(webpBuffer as any, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
        "CDN-Cache-Control": "public, max-age=31536000",
        "Vercel-CDN-Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error: any) {
    console.error("Image optimization error:", error);
    
    // Try to get original URL and redirect
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");
    
    if (imageUrl) {
      return NextResponse.redirect(imageUrl, { status: 302 });
    }
    
    return NextResponse.json(
      { error: "Failed to optimize image" },
      { status: 500 }
    );
  }
}
