import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { Referral, UserProfile } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

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
        const userProfileResult = await db.select().from(UserProfile)
          .where(eq(UserProfile.wallet, wallet.toLowerCase()))
          .limit(1);
        const userProfile = userProfileResult[0];
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

    const referrerFidStr = String(referrerFid);
    // Count total referrals
    const totalCountResult = await db.select({ count: count() })
      .from(Referral)
      .where(eq(Referral.referrerFid, referrerFidStr));
    const totalCount = Number(totalCountResult[0]?.count || 0);

    // Count clicked referrals
    const clickedCountResult = await db.select({ count: count() })
      .from(Referral)
      .where(and(
        eq(Referral.referrerFid, referrerFidStr),
        eq(Referral.clicked, true)
      ));
    const clickedCount = Number(clickedCountResult[0]?.count || 0);

    // Count converted referrals (completed quests)
    const convertedCountResult = await db.select({ count: count() })
      .from(Referral)
      .where(and(
        eq(Referral.referrerFid, referrerFidStr),
        eq(Referral.converted, true)
      ));
    const convertedCount = Number(convertedCountResult[0]?.count || 0);

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

