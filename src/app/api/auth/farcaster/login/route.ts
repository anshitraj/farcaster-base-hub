import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEYNAR_CLIENT_ID;
    
    if (!clientId) {
      console.error("Neynar client ID not configured");
      return NextResponse.json(
        { error: "Neynar client ID not configured" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/farcaster/callback`;
    const encodedRedirectUri = encodeURIComponent(redirectUri);

    // Build OAuth URL with proper parameters
    const authUrl = new URL("https://app.neynar.com/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");

    console.log("Redirecting to Farcaster OAuth:", authUrl.toString());
    console.log("Redirect URI:", redirectUri);
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error("Farcaster login error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Farcaster login", message: error?.message },
      { status: 500 }
    );
  }
}

