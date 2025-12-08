import { NextRequest, NextResponse } from "next/server";
import { searchMiniApps } from "@/lib/neynar/searchMiniApps";

/**
 * Test endpoint to debug Neynar search API
 * Call this to see what the API actually returns
 */
export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "game";
    const limit = parseInt(searchParams.get("limit") || "10");
    const useNetworks = searchParams.get("networks") !== "false";

    console.log(`Testing Neynar search with: q="${q}", limit=${limit}, networks=${useNetworks}`);

    const result = await searchMiniApps({
      q,
      limit,
      networks: useNetworks ? ["base"] : undefined,
    });

    return NextResponse.json({
      success: true,
      query: q,
      limit,
      usedNetworksFilter: useNetworks,
      resultCount: result.frames?.length || 0,
      frames: result.frames?.slice(0, 3) || [], // Return first 3 for inspection
      hasNextCursor: !!result.nextCursor,
      rawResponse: {
        framesType: typeof result.frames,
        isArray: Array.isArray(result.frames),
        length: result.frames?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("Test search error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

