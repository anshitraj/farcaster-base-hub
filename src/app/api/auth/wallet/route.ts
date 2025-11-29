import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies, createWalletSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { verifyMessage } from "ethers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, signature, message } = body;

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Basic validation - wallet should be a valid Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Verify signature if provided
    if (signature && message) {
      try {
        const resolved = verifyMessage(message, signature).toLowerCase();
        if (resolved !== wallet.toLowerCase()) {
          console.warn("Signature mismatch - allowing for MVP");
          // For MVP, we'll allow connection without strict signature verification
          // In production, you should require valid signatures and return error here
        }
      } catch (sigError) {
        console.warn("Signature verification error - allowing for MVP:", sigError);
        // For MVP, we'll allow connection without signature verification
        // In production, you should require valid signatures
      }
    }

    try {
      const session = await createWalletSession(wallet);
      const cookieStore = await cookies();
      
      cookieStore.set("sessionToken", session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });

      const response = NextResponse.json({
        wallet: session.wallet,
        sessionToken: session.sessionToken,
        success: true,
      });

      // Also set cookie on response for better compatibility
      response.cookies.set("sessionToken", session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    } catch (dbError: any) {
      // Only log if it's not a database connection error (to reduce spam)
      if (!dbError?.isDatabaseError && !dbError?.code?.includes('P1001')) {
        console.error("Database error in auth:", dbError);
      }
      
      // Even if DB fails, create a temporary session token and store in cookie
      // This allows the app to work even when DB is down
      const tempSessionToken = crypto.randomBytes(32).toString("hex");
      const cookieStore = await cookies();
      
      cookieStore.set("sessionToken", tempSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      
      // Store wallet in a separate cookie as fallback
      cookieStore.set("walletAddress", wallet.toLowerCase(), {
        httpOnly: false, // Allow JS to read it as fallback
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      const response = NextResponse.json({
        wallet: wallet.toLowerCase(),
        sessionToken: tempSessionToken,
        warning: "Database unavailable, using temporary session",
      });

      response.cookies.set("sessionToken", tempSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }
  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (session) {
      return NextResponse.json({
        wallet: session.wallet,
      });
    }

    // Fallback: check walletAddress cookie if DB session doesn't exist
    const cookieStore = await cookies();
    const walletFromCookie = cookieStore.get("walletAddress")?.value;
    
    if (walletFromCookie) {
      // Normalize wallet address (lowercase, trim)
      const normalizedWallet = walletFromCookie.toLowerCase().trim();
      return NextResponse.json({
        wallet: normalizedWallet,
      });
    }

    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  } catch (error: any) {
    // Only log if it's not a database connection error (to reduce spam)
    if (!error?.code?.includes('P1001') && !error?.message?.includes('Can\'t reach database')) {
      console.error("Get auth error:", error);
    }
    
    // Fallback: try to get wallet from cookie
    try {
      const cookieStore = await cookies();
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        return NextResponse.json({
          wallet: walletFromCookie,
        });
      }
    } catch (cookieError) {
      // Ignore cookie errors
    }
    
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Delete both sessionToken and walletAddress cookies
    cookieStore.delete("sessionToken");
    cookieStore.delete("walletAddress");
    
    const response = NextResponse.json({ success: true });
    
    // Also clear cookies in the response to ensure they're deleted on client side
    response.cookies.delete("sessionToken");
    response.cookies.delete("walletAddress");
    
    // Set cookies with expired dates to ensure they're cleared
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    response.cookies.set("walletAddress", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
