import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Warpcast OAuth Login Route
 * Redirects user to Warpcast OAuth authorization page
 */

export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_WARPCAST_CLIENT_ID;
    
    if (!clientId) {
      console.error("Warpcast client ID not configured");
      return NextResponse.json(
        { error: "Warpcast client ID not configured" },
        { status: 500 }
      );
    }

    const redirectUrl = process.env.NEXT_PUBLIC_WARPCAST_REDIRECT_URL || 
      `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/auth/callback`;
    
    // Build Warpcast OAuth URL
    const authUrl = new URL("https://warpcast.com/~/oauth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid offline_access");

    console.log("Redirecting to Warpcast OAuth:", authUrl.toString());
    console.log("Redirect URI:", redirectUrl);
    
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error("Warpcast login error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Warpcast login", message: error?.message },
      { status: 500 }
    );
  }
}

