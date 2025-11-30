import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * FIP-11: Create Channel for Sign In With Farcaster
 * Creates a channel token for QR code authentication
 */
export async function POST(request: NextRequest) {
  try {
    const appDomain = process.env.APP_DOMAIN;
    const appLoginUrl = process.env.APP_LOGIN_URL;
    const authKey = process.env.FARCASTER_AUTH_KEY;

    if (!appDomain || !appLoginUrl || !authKey) {
      console.error("Missing FIP-11 configuration");
      return NextResponse.json(
        { error: "FIP-11 configuration missing. Check APP_DOMAIN, APP_LOGIN_URL, and FARCASTER_AUTH_KEY" },
        { status: 500 }
      );
    }

    // Create channel via Warpcast Connect Relay
    const response = await fetch("https://connect.farcaster.xyz/v1/channel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authKey}`,
      },
      body: JSON.stringify({
        domain: appDomain,
        siweUri: appLoginUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Channel creation failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        requestBody: { domain: appDomain, siweUri: appLoginUrl },
      });
      
      // Try to parse error as JSON for better error messages
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.message || errorJson.error || errorText;
      } catch {
        // Not JSON, use as-is
      }

      return NextResponse.json(
        { 
          error: "Failed to create channel", 
          details: errorDetails,
          status: response.status,
          hint: response.status === 401 ? "Check FARCASTER_AUTH_KEY is valid" : 
                response.status === 400 ? "Check APP_DOMAIN and APP_LOGIN_URL format" :
                "Check server logs for details"
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      channelToken: data.channelToken,
      url: data.url,
    });
  } catch (error: any) {
    console.error("Create channel error:", error);
    
    // Check for network/DNS errors
    const isNetworkError = error?.code === "ENOTFOUND" || 
                          error?.message?.includes("fetch failed") ||
                          error?.message?.includes("getaddrinfo");
    
    return NextResponse.json(
      { 
        error: "Failed to create channel", 
        message: error?.message,
        details: isNetworkError ? "Network connectivity issue. Farcaster login requires internet connection and may not be available in all browsers." : error?.message,
        networkError: isNetworkError
      },
      { status: 500 }
    );
  }
}

