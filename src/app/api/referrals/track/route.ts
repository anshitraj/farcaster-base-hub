import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { awardReferralClickPoints } from "@/lib/referral-helpers";

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
        const userProfile = await prisma.userProfile.findFirst({
          where: { farcasterFid: String(referrerFid) },
        });
        if (userProfile) {
          finalReferrerWallet = userProfile.wallet;
        }
      } catch (error) {
        // Ignore errors
      }
    }

    // Check if referral already exists
    const existingReferral = await prisma.referral.findFirst({
      where: {
        referrerFid: String(referrerFid),
        referredWallet: currentWallet ? currentWallet.toLowerCase() : null,
        clicked: true,
      },
      orderBy: {
        clickedAt: 'desc',
      },
    });

    let referral;
    let isNewClick = false;
    
    if (existingReferral && !existingReferral.converted) {
      // Update existing referral
      referral = existingReferral;
    } else {
      // Create new referral record
      isNewClick = true;
      referral = await prisma.referral.create({
        data: {
          referrerFid: String(referrerFid),
          referrerWallet: finalReferrerWallet ? finalReferrerWallet.toLowerCase() : null,
          referredWallet: currentWallet ? currentWallet.toLowerCase() : null,
          referralUrl,
          clicked: true,
          clickedAt: new Date(),
        },
      });
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

