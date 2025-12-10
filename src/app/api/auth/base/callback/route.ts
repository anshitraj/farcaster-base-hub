import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { createWalletSession } from "@/lib/auth";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Base login error:", error);
      return NextResponse.redirect(new URL(`/?error=base_login_failed&message=${encodeURIComponent(error)}`, request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/?error=no_code", request.url));
    }

    const clientId = process.env.NEXT_PUBLIC_COINBASE_CLIENT_ID;
    const clientSecret = process.env.COINBASE_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/base/callback`;

    if (!clientId || !clientSecret) {
      console.error("Coinbase Keys credentials not configured");
      return NextResponse.redirect(new URL("/?error=config", request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://keys.coinbase.com/oauth/token", {
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
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access token received");
      return NextResponse.redirect(new URL("/?error=no_token", request.url));
    }

    // Get wallet account info from Coinbase Keys API
    const accountResponse = await fetch("https://keys.coinbase.com/api/v1/accounts", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!accountResponse.ok) {
      console.error("Failed to fetch account info");
      return NextResponse.redirect(new URL("/?error=account_fetch_failed", request.url));
    }

    const accountData = await accountResponse.json();
    const walletAddress = accountData?.data?.[0]?.addresses?.[0]?.address;

    if (!walletAddress) {
      console.error("No wallet address found in account data");
      return NextResponse.redirect(new URL("/?error=no_wallet_address", request.url));
    }

    // Normalize wallet address
    const normalizedWallet = walletAddress.toLowerCase().trim();

    // Create or update developer profile
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, normalizedWallet))
      .limit(1);
    let developer = developerResult[0];

    if (!developer) {
      const [newDeveloper] = await db.insert(Developer).values({
        wallet: normalizedWallet,
      }).returning();
      developer = newDeveloper;
    }

    // Create session
    const session = await createWalletSession(normalizedWallet);
    const cookieStore = await cookies();
    
    // Set session cookie
    cookieStore.set("sessionToken", session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Also set walletAddress cookie for quick access
    cookieStore.set("walletAddress", normalizedWallet, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Redirect to home page with success
    return NextResponse.redirect(new URL("/?login=success", request.url));
  } catch (error: any) {
    console.error("Base login callback error:", error);
    return NextResponse.redirect(new URL("/?error=callback_error", request.url));
  }
}

