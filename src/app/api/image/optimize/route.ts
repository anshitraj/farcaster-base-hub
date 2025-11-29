import { NextRequest, NextResponse } from "next/server";

/**
 * Image optimization API route
 * Converts external images (especially PNG from Base Mini App JSON) to WebP format
 * This allows us to serve WebP even when the source is PNG
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");
    const width = searchParams.get("w");
    const height = searchParams.get("h");
    const quality = searchParams.get("q") || "85";

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid image URL" },
        { status: 400 }
      );
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MiniAppStore/1.0)",
      },
      // Add timeout
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: imageResponse.status }
      );
    }

    // Get the image buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/png";

    // If it's already WebP, return as-is
    if (contentType.includes("webp")) {
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // For Next.js, we'll use the built-in image optimization
    // But we need to proxy through Next.js Image Optimization API
    // This route will redirect to Next.js internal optimization
    // OR we can use sharp to convert to WebP server-side

    // For now, let's use Next.js built-in optimization by redirecting
    // to the Next.js image optimization endpoint
    const optimizedUrl = new URL("/_next/image", request.url);
    optimizedUrl.searchParams.set("url", imageUrl);
    if (width) optimizedUrl.searchParams.set("w", width);
    if (height) optimizedUrl.searchParams.set("h", height);
    optimizedUrl.searchParams.set("q", quality);

    // Redirect to Next.js image optimization (which will convert to WebP)
    return NextResponse.redirect(optimizedUrl);
  } catch (error: any) {
    console.error("Image optimization error:", error);
    return NextResponse.json(
      { error: "Failed to optimize image", message: error?.message },
      { status: 500 }
    );
  }
}

