import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { setPremiumEnabled } from "@/app/api/settings/premium/route";

// Feature flags stored in environment or database
// For now, we'll use a simple in-memory store (in production, use database or env vars)
let featureFlags = {
  premiumEnabled: true, // Default: enabled
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      const walletCookie = cookieStore.get("walletAddress")?.value;
      if (walletCookie) {
        wallet = walletCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: { isAdmin: true },
    });

    if (!developer || !developer.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // In production, fetch from database or env vars
    // For now, return the in-memory flags
    return NextResponse.json({
      settings: {
        premiumEnabled: featureFlags.premiumEnabled,
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      const walletCookie = cookieStore.get("walletAddress")?.value;
      if (walletCookie) {
        wallet = walletCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: { isAdmin: true },
    });

    if (!developer || !developer.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { premiumEnabled } = body;

    if (typeof premiumEnabled !== "undefined") {
      featureFlags.premiumEnabled = Boolean(premiumEnabled);
      // Update the public API as well
      setPremiumEnabled(Boolean(premiumEnabled));
    }

    return NextResponse.json({
      success: true,
      settings: {
        premiumEnabled: featureFlags.premiumEnabled,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

