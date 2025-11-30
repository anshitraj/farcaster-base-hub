import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "crypto";

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
    let developer = await prisma.developer.findFirst({
      where: {
        OR: [
          { wallet: farcasterWallet },
        ],
      },
    });

    // Create or update developer record
    if (developer) {
      developer = await prisma.developer.update({
        where: { id: developer.id },
        data: {
          wallet: farcasterWallet,
          name: displayName || username || developer.name,
          avatar: pfpUrl || developer.avatar,
        },
      });
    } else {
      developer = await prisma.developer.create({
        data: {
          wallet: farcasterWallet,
          name: displayName || username || `User ${fid}`,
          avatar: pfpUrl || null,
          developerLevel: 1,
          streakCount: 0,
          totalXP: 0,
          verified: true,
          isOfficial: false,
        },
      });
    }

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

