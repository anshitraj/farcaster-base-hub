import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { UserSession } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/**
 * Logout Route
 * Clears session cookies and redirects to home
 */

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("sessionToken")?.value;

    // Delete session from database if exists
    if (sessionToken) {
      try {
        await db.delete(UserSession).where(eq(UserSession.sessionToken, sessionToken));
      } catch (error) {
        console.error("Error deleting session:", error);
        // Continue even if deletion fails - database might be unavailable
      }
    }

    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.NEXT_PUBLIC_URL || 
                    request.nextUrl.origin || 
                    "http://localhost:3000";

    // Create response with redirect
    const response = NextResponse.redirect(new URL("/", baseUrl));

    // Clear all session cookies
    response.cookies.set("sessionToken", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("fid", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("farcasterSession", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("walletAddress", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("fc_user_data", "", {
      expires: new Date(0),
      path: "/",
    });

    console.log("Logout successful");
    return response;
  } catch (error: any) {
    console.error("Logout error:", error);
    
    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.NEXT_PUBLIC_URL || 
                    request.nextUrl?.origin || 
                    "http://localhost:3000";
    
    // Still redirect even if there's an error - clear cookies anyway
    const response = NextResponse.redirect(new URL("/", baseUrl));
    
    // Clear cookies with expiration
    response.cookies.set("sessionToken", "", { expires: new Date(0), path: "/" });
    response.cookies.set("fid", "", { expires: new Date(0), path: "/" });
    response.cookies.set("farcasterSession", "", { expires: new Date(0), path: "/" });
    response.cookies.set("walletAddress", "", { expires: new Date(0), path: "/" });
    response.cookies.set("fc_user_data", "", { expires: new Date(0), path: "/" });
    
    return response;
  }
}

