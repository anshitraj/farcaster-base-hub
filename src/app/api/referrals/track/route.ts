import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { awardReferralClickPoints } from "@/lib/referral-helpers";
import { Referral, UserProfile } from "@/db/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

export const dynamic = 'force-dynamic';

// Track when a referral link is clicked
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referrerFid, referrerWallet, referralUrl, referredWallet } = body;

    if (!referrerFid || !referralUrl) {
      return NextResponse.json(
        { error: "referrerFid and referralUrl are required" },
        { status: 400 }
      );
    }

    // Get session to get current user's wallet
    const { getSessionFromCookies } = await import("@/lib/auth");
    const session = await getSessionFromCookies();
    const currentWallet = session?.wallet || referredWallet;

    // Try to get referrer wallet from profile if not provided
    let finalReferrerWallet = referrerWallet;
    if (!finalReferrerWallet) {
      try {
        const userProfileResult = await db.select().from(UserProfile)
          .where(eq(UserProfile.farcasterFid, String(referrerFid)))
          .limit(1);
        const userProfile = userProfileResult[0];
        if (userProfile) {
          finalReferrerWallet = userProfile.wallet;
        }
      } catch (error) {
        // Ignore errors
      }
    }

    const referredWalletLower = currentWallet ? currentWallet.toLowerCase() : null;
    // Check if referral already exists
    const conditions = [
      eq(Referral.referrerFid, String(referrerFid)),
      eq(Referral.clicked, true)
    ];
    if (referredWalletLower) {
      conditions.push(eq(Referral.referredWallet, referredWalletLower));
    } else {
      conditions.push(isNull(Referral.referredWallet));
    }
    
    const existingReferralResult = await db.select().from(Referral)
      .where(and(...conditions))
      .orderBy(desc(Referral.clickedAt))
      .limit(1);
    const existingReferral = existingReferralResult[0];

    let referral;
    let isNewClick = false;
    
    if (existingReferral && !existingReferral.converted) {
      // Update existing referral
      referral = existingReferral;
    } else {
      // Create new referral record
      isNewClick = true;
      const [newReferral] = await db.insert(Referral).values({
        referrerFid: String(referrerFid),
        referrerWallet: finalReferrerWallet ? finalReferrerWallet.toLowerCase() : null,
        referredWallet: referredWalletLower,
        referralUrl,
        clicked: true,
        clickedAt: new Date(),
      }).returning();
      referral = newReferral;
    }

    // Award 100 points to referrer for the click (only for new clicks)
    if (isNewClick) {
      await awardReferralClickPoints(finalReferrerWallet, String(referrerFid));
    }

    return NextResponse.json({
      success: true,
      referral: {
        id: referral.id,
        referrerFid: referral.referrerFid,
      },
    });
  } catch (error: any) {
    console.error("Error tracking referral:", error);
    return NextResponse.json(
      { error: "Failed to track referral", details: error.message },
      { status: 500 }
    );
  }
}

