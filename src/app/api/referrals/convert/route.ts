import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { Referral, UserProfile, UserPoints, PointsTransaction } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

// Mark a referral as converted (when referred user completes a quest)
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
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

    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { referrerFid } = body;

    if (!referrerFid) {
      return NextResponse.json(
        { error: "referrerFid is required" },
        { status: 400 }
      );
    }

    const walletLower = wallet.toLowerCase();
    // Get user's FID from profile
    const userProfileResult = await db.select().from(UserProfile)
      .where(eq(UserProfile.wallet, walletLower))
      .limit(1);
    const userProfile = userProfileResult[0];

    const referredFid = userProfile?.farcasterFid || null;

    // Find the referral record
    const referralResult = await db.select().from(Referral)
      .where(and(
        eq(Referral.referrerFid, String(referrerFid)),
        eq(Referral.referredWallet, walletLower),
        eq(Referral.clicked, true),
        eq(Referral.converted, false)
      ))
      .orderBy(desc(Referral.clickedAt))
      .limit(1);
    const referral = referralResult[0];

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Mark as converted
    const [updated] = await db.update(Referral)
      .set({
        converted: true,
        convertedAt: new Date(),
        referredFid: referredFid,
      })
      .where(eq(Referral.id, referral.id))
      .returning();

    // Award points to the referrer
    if (updated.referrerWallet) {
      const referrerWalletLower = updated.referrerWallet.toLowerCase();
      const referrerPointsResult = await db.select().from(UserPoints)
        .where(eq(UserPoints.wallet, referrerWalletLower))
        .limit(1);
      const referrerPoints = referrerPointsResult[0];

      if (referrerPoints) {
        const pointsToAward = 50; // Points for successful referral conversion
        await db.update(UserPoints)
          .set({
            totalPoints: referrerPoints.totalPoints + pointsToAward,
          })
          .where(eq(UserPoints.wallet, referrerWalletLower));

        // Create transaction record
        await db.insert(PointsTransaction).values({
          wallet: referrerWalletLower,
          points: pointsToAward,
          type: "referral",
          description: `Referral conversion - ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
          referenceId: updated.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      referral: {
        id: updated.id,
        converted: updated.converted,
      },
    });
  } catch (error: any) {
    console.error("Error converting referral:", error);
    return NextResponse.json(
      { error: "Failed to convert referral", details: error.message },
      { status: 500 }
    );
  }
}

