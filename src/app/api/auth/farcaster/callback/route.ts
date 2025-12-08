import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { Developer, UserSession } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

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
      console.error("NEYNAR_CLIENT_ID:", clientId ? "Set" : "Missing");
      console.error("NEYNAR_CLIENT_SECRET:", clientSecret ? "Set" : "Missing");
      return NextResponse.redirect(new URL("/?error=config", request.url));
    }

    console.log("Farcaster callback - redirectUri:", redirectUri);

    // Exchange code for access token
    console.log("Exchanging code for token...");
    console.log("Token exchange params:", {
      client_id: clientId ? "Set" : "Missing",
      client_secret: clientSecret ? "Set" : "Missing",
      redirect_uri: redirectUri,
      code: code ? "Present" : "Missing",
    });

    const tokenResponse = await fetch("https://app.neynar.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
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
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
      });
      
      // Provide helpful error messages based on status code
      let errorMessage = `token_exchange&status=${tokenResponse.status}`;
      if (tokenResponse.status === 400) {
        errorMessage += "&hint=Check redirect_uri matches Neynar dashboard";
      } else if (tokenResponse.status === 401) {
        errorMessage += "&hint=Check NEYNAR_CLIENT_ID and NEYNAR_CLIENT_SECRET";
      } else if (tokenResponse.status === 403) {
        errorMessage += "&hint=Redirect URI not authorized in Neynar dashboard";
      }
      
      return NextResponse.redirect(new URL(`/?error=${errorMessage}`, request.url));
    }

    const tokenData = await tokenResponse.json();
    console.log("Token exchange response:", { 
      hasAccessToken: !!tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    });
    
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access token received:", tokenData);
      return NextResponse.redirect(new URL("/?error=no_token", request.url));
    }

    console.log("Fetching user info from Neynar...");
    // Get user info from Neynar - try different response structures
    const userResponse = await fetch("https://api.neynar.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "apikey": process.env.NEYNAR_API_KEY || "",
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("User fetch failed:", userResponse.status, errorText);
      return NextResponse.redirect(new URL("/?error=user_fetch", request.url));
    }

    const userData = await userResponse.json();
    console.log("Neynar user data response:", JSON.stringify(userData, null, 2));
    
    // Handle different response structures
    type UserData = {
      fid?: number | string;
      username?: string;
      display_name?: string;
      pfp_url?: string;
      pfp?: { url?: string };
    };
    
    let fc: UserData | null = null;
    if (userData.result?.user) {
      fc = userData.result.user;
    } else if (userData.user) {
      fc = userData.user;
    } else if (userData.data?.user) {
      fc = userData.data.user;
    } else if (userData.fid) {
      // Direct user object
      fc = userData as UserData;
    }

    if (!fc || !fc.fid) {
      console.error("Invalid user data structure:", userData);
      return NextResponse.redirect(new URL("/?error=no_user", request.url));
    }

    const fid = fc.fid.toString();
    const username = fc.username || fc.display_name || `fid-${fid}`;
    const pfpUrl = fc.pfp_url || fc.pfp?.url || null;

    // Create or update developer profile
    // Using a special prefix for Farcaster FIDs to distinguish from wallet addresses
    const farcasterWallet = `farcaster:${fid}`;

    // Check if developer exists
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, farcasterWallet))
      .limit(1);
    let developer = developerResult[0];

    if (developer) {
      // Update existing developer
      const [updated] = await db.update(Developer)
        .set({
          name: username,
          avatar: pfpUrl,
        })
        .where(eq(Developer.id, developer.id))
        .returning();
      developer = updated;
    } else {
      // Create new developer
      const [created] = await db.insert(Developer).values({
        wallet: farcasterWallet,
        name: username,
        avatar: pfpUrl,
      }).returning();
      developer = created;
    }

    // Create or update session (handle duplicates)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const sessionToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      // Delete any existing sessions for this wallet first
      await db.delete(UserSession).where(eq(UserSession.wallet, farcasterWallet));
      
      await db.insert(UserSession).values({
        wallet: farcasterWallet,
        sessionToken,
        expiresAt,
      });
    } catch (sessionError: any) {
      console.error("Session creation error:", sessionError);
      // Continue even if session creation fails - user can still be logged in via cookie
    }

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

