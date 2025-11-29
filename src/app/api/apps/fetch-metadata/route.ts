import { NextRequest, NextResponse } from "next/server";
import { fetchFarcasterMetadata } from "@/lib/farcaster-metadata";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const metadata = await fetchFarcasterMetadata(url);

    if (!metadata) {
      return NextResponse.json(
        { metadata: null, message: "No farcaster.json found or invalid format" },
        { status: 200 }
      );
    }

    return NextResponse.json({ metadata });
  } catch (error: any) {
    console.error("Fetch metadata error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata", metadata: null },
      { status: 500 }
    );
  }
}

