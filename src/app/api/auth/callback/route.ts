import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { Developer, UserSession } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/**
 * Warpcast OAuth Callback Route
 * Handles the OAuth callback, exchanges code for tokens, and creates/updates user session
 */

export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(new URL(`/?error=oauth_error&message=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/?error=no_code", request.url));
    }

    const clientId = process.env.NEXT_PUBLIC_WARPCAST_CLIENT_ID;
    const clientSecret = process.env.WARPCAST_CLIENT_SECRET;
    const redirectUrl = process.env.NEXT_PUBLIC_WARPCAST_REDIRECT_URL || 
      `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/auth/callback`;

    if (!clientId || !clientSecret) {
      console.error("Warpcast credentials not configured");
      return NextResponse.redirect(new URL("/?error=config", request.url));
    }

    console.log("Exchanging code for token...");

    // Step 2: Exchange code for access token
    const tokenResponse = await fetch("https://api.warpcast.com/v2/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
      });
      
      let errorMessage = `token_exchange&status=${tokenResponse.status}`;
      if (tokenResponse.status === 400) {
        errorMessage += "&hint=Check redirect_uri matches Warpcast app settings";
      } else if (tokenResponse.status === 401) {
        errorMessage += "&hint=Check WARPCAST_CLIENT_ID and WARPCAST_CLIENT_SECRET";
      }
      
      return NextResponse.redirect(new URL(`/?error=${errorMessage}`, request.url));
    }

    const tokenData = await tokenResponse.json();
    console.log("Token exchange successful");

    // Step 3: Extract user data from response
    const {
      fid,
      username,
      display_name,
      avatar_url,
      custody_address,
      access_token,
      refresh_token,
    } = tokenData;

    if (!fid || !custody_address) {
      console.error("Missing required user data:", tokenData);
      return NextResponse.redirect(new URL("/?error=no_user_data", request.url));
    }

    console.log("User data received:", { fid, username, display_name });

    // Normalize wallet address
    const normalizedWallet = custody_address.toLowerCase().trim();
    const farcasterWallet = `farcaster:${fid}`;

    // Check if developer already exists (by wallet or FID)
    let developerResult = await db.select().from(Developer)
      .where(or(
        eq(Developer.wallet, normalizedWallet),
        eq(Developer.wallet, farcasterWallet)
      ))
      .limit(1);
    let developer = developerResult[0];

    // Create or update developer record
    if (developer) {
      // Update existing developer
      const [updated] = await db.update(Developer)
        .set({
          wallet: farcasterWallet, // Use farcaster: format
          name: display_name || username || developer.name,
          avatar: avatar_url || developer.avatar,
        })
        .where(eq(Developer.id, developer.id))
        .returning();
      developer = updated;
    } else {
      // Create new developer
      const [created] = await db.insert(Developer).values({
        wallet: farcasterWallet,
        name: display_name || username || `User ${fid}`,
        avatar: avatar_url || null,
        developerLevel: 1,
        streakCount: 0,
        totalXP: 0,
        verified: true,
        isOfficial: false,
      }).returning();
      developer = created;
    }

    // Create session using Web Crypto API for Edge Runtime
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const sessionToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store session in database
    await db.insert(UserSession).values({
      wallet: farcasterWallet,
      sessionToken,
      expiresAt,
    });

    // Create response and set cookies
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    
    // Set session cookie
    response.cookies.set("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Store FID and user data in cookies for quick access
    response.cookies.set("fid", fid.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("farcasterSession", fid.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Also store user data in a cookie (for server-side access)
    response.cookies.set("fc_user_data", JSON.stringify({
      fid,
      username,
      displayName: display_name,
      pfpUrl: avatar_url,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    console.log("Login successful, redirecting to dashboard");
    return response;
  } catch (error: any) {
    console.error("Callback error:", error);
    return NextResponse.redirect(new URL("/?error=callback_error", request.url));
  }
}

