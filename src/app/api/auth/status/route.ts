import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * FIP-11: Check Channel Status
 * Polls the channel status to check if user has authenticated
 */

export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const channelToken = url.searchParams.get("channelToken");

    if (!channelToken) {
      return NextResponse.json(
        { error: "channelToken is required" },
        { status: 400 }
      );
    }

    const authKey = process.env.FARCASTER_AUTH_KEY;

    if (!authKey) {
      return NextResponse.json(
        { error: "FARCASTER_AUTH_KEY not configured" },
        { status: 500 }
      );
    }

    // Check channel status
    const response = await fetch(`https://connect.farcaster.xyz/v1/channel/status?channelToken=${encodeURIComponent(channelToken)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Status check failed:", {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        { error: "Failed to check status", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      state: data.state, // "pending" | "completed" | "expired"
      fid: data.fid,
      username: data.username,
      pfpUrl: data.pfpUrl,
      displayName: data.displayName,
      bio: data.bio,
      signature: data.signature,
      message: data.message,
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status", message: error?.message },
      { status: 500 }
    );
  }
}

