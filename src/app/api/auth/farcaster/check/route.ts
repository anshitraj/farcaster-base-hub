import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to check Farcaster/Neynar OAuth configuration
 * This helps identify configuration issues without exposing sensitive data
 */

export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.NEYNAR_CLIENT_ID;
    const clientSecret = process.env.NEYNAR_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/farcaster/callback`;

    const diagnostics = {
      // Credentials check
      credentials: {
        clientId: clientId ? "✅ Set" : "❌ Missing",
        clientSecret: clientSecret ? "✅ Set" : "❌ Missing",
        baseUrl: baseUrl,
      },
      // Redirect URI
      redirectUri: {
        expected: redirectUri,
        encoded: encodeURIComponent(redirectUri),
        note: "This must match EXACTLY in your Neynar dashboard",
      },
      // OAuth URL
      oauthUrl: {
        authorize: "https://app.neynar.com/oauth/authorize",
        token: "https://app.neynar.com/oauth/token",
        api: "https://api.neynar.com/v2/me",
      },
      // Configuration checklist
      checklist: {
        clientIdConfigured: !!clientId,
        clientSecretConfigured: !!clientSecret,
        baseUrlConfigured: baseUrl !== "http://localhost:3000" || process.env.NODE_ENV === "development",
      },
      // Instructions
      instructions: {
        step1: "Go to https://neynar.com and sign in",
        step2: "Navigate to your app settings/OAuth configuration",
        step3: `Add this EXACT redirect URI: ${redirectUri}`,
        step4: "Make sure the redirect URI matches character-for-character (including https/http)",
        step5: "Save the configuration in Neynar dashboard",
      },
      // Common issues
      commonIssues: {
        redirectUriMismatch: "The redirect URI in Neynar dashboard must match EXACTLY (case-sensitive, including protocol)",
        missingCredentials: "NEYNAR_CLIENT_ID and NEYNAR_CLIENT_SECRET must be set in environment variables",
        wrongBaseUrl: "NEXT_PUBLIC_BASE_URL should be your production URL (e.g., https://minicast.store)",
        httpVsHttps: "Make sure both use the same protocol (http vs https)",
      },
    };

    return NextResponse.json(diagnostics, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: "Failed to generate diagnostics",
        message: error?.message 
      },
      { status: 500 }
    );
  }
}

