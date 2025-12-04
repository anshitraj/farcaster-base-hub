import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// Get referral count for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Get FID from query params or session
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");
    
    let referrerFid: string | null = null;
    
    if (fid) {
      referrerFid = fid;
    } else {
      // Try to get from session/auth
      let wallet: string | null = null;
      if (session) {
        wallet = session.wallet;
      } else {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const walletFromCookie = cookieStore.get("walletAddress")?.value;
        if (walletFromCookie) {
          wallet = walletFromCookie;
        }
      }

      if (wallet) {
        // Try to get FID from user profile
        const userProfile = await prisma.userProfile.findUnique({
          where: { wallet: wallet.toLowerCase() },
        });
        if (userProfile?.farcasterFid) {
          referrerFid = userProfile.farcasterFid;
        }
      }
    }

    if (!referrerFid) {
      return NextResponse.json({
        count: 0,
        clicked: 0,
        converted: 0,
      });
    }

    // Count total referrals
    const totalCount = await prisma.referral.count({
      where: {
        referrerFid: String(referrerFid),
      },
    });

    // Count clicked referrals
    const clickedCount = await prisma.referral.count({
      where: {
        referrerFid: String(referrerFid),
        clicked: true,
      },
    });

    // Count converted referrals (completed quests)
    const convertedCount = await prisma.referral.count({
      where: {
        referrerFid: String(referrerFid),
        converted: true,
      },
    });

    return NextResponse.json({
      count: totalCount,
      clicked: clickedCount,
      converted: convertedCount,
    });
  } catch (error: any) {
    console.error("Error getting referral count:", error);
    return NextResponse.json(
      { error: "Failed to get referral count", details: error.message },
      { status: 500 }
    );
  }
}

