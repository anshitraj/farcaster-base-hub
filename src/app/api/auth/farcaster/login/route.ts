import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.NEYNAR_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json(
      { error: "Neynar client ID not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/farcaster/callback`);

  const authUrl = `https://app.neynar.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid`;

  return NextResponse.redirect(authUrl);
}

