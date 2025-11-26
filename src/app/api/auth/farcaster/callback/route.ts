import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/?error=no_code", request.url));
    }

    const clientId = process.env.NEYNAR_CLIENT_ID;
    const clientSecret = process.env.NEYNAR_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/farcaster/callback`;

    if (!clientId || !clientSecret) {
      console.error("Neynar credentials not configured");
      return NextResponse.redirect(new URL("/?error=config", request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://app.neynar.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(new URL("/?error=token_exchange", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Neynar
    const userResponse = await fetch("https://api.neynar.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("User fetch failed:", await userResponse.text());
      return NextResponse.redirect(new URL("/?error=user_fetch", request.url));
    }

    const userData = await userResponse.json();
    const fc = userData.result?.user;

    if (!fc) {
      return NextResponse.redirect(new URL("/?error=no_user", request.url));
    }

    const fid = fc.fid.toString();
    const username = fc.username || `fid-${fid}`;
    const pfpUrl = fc.pfp_url || null;

    // Create or update developer profile
    // Using a special prefix for Farcaster FIDs to distinguish from wallet addresses
    const farcasterWallet = `farcaster:${fid}`;

    const developer = await prisma.developer.upsert({
      where: { wallet: farcasterWallet },
      update: {
        name: username,
        avatar: pfpUrl,
      },
      create: {
        wallet: farcasterWallet,
        name: username,
        avatar: pfpUrl,
      },
    });

    // Create session
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.userSession.create({
      data: {
        wallet: farcasterWallet,
        sessionToken,
        expiresAt,
      },
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Also set Farcaster-specific cookie
    cookieStore.set("farcasterSession", fid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error: any) {
    console.error("Farcaster callback error:", error);
    return NextResponse.redirect(new URL("/?error=callback_error", request.url));
  }
}

