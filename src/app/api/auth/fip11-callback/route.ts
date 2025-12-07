import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { Developer, UserSession } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/**
 * FIP-11 Callback: Save Farcaster user to database after QR scan
 * Called from login page after successful authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username, displayName, pfpUrl, bio, signature, message } = body;

    if (!fid) {
      return NextResponse.json(
        { error: "FID is required" },
        { status: 400 }
      );
    }

    const farcasterWallet = `farcaster:${fid}`;

    // Check if developer already exists
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, farcasterWallet))
      .limit(1);
    let developer = developerResult[0];

    // Create or update developer record
    if (developer) {
      const [updated] = await db.update(Developer)
        .set({
          wallet: farcasterWallet,
          name: displayName || username || developer.name,
          avatar: pfpUrl || developer.avatar,
        })
        .where(eq(Developer.id, developer.id))
        .returning();
      developer = updated;
    } else {
      const [created] = await db.insert(Developer).values({
        wallet: farcasterWallet,
        name: displayName || username || `User ${fid}`,
        avatar: pfpUrl || null,
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

    await db.insert(UserSession).values({
      wallet: farcasterWallet,
      sessionToken,
      expiresAt,
    });

    // Create response
    const response = NextResponse.json({ success: true });

    // Set cookies
    response.cookies.set("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

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

    return response;
  } catch (error: any) {
    console.error("FIP-11 callback error:", error);
    return NextResponse.json(
      { error: "Failed to save user", message: error?.message },
      { status: 500 }
    );
  }
}

