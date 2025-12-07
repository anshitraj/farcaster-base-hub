import { db } from "@/lib/db";
import { Referral, UserProfile, UserPoints, PointsTransaction } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

/**
 * Convert a referral when a user completes a quest
 * This awards points to the referrer when the referred user completes any quest
 */
export async function convertReferralForUser(wallet: string): Promise<void> {
  try {
    const walletLower = wallet.toLowerCase();
    // Check if user has a referral that needs to be converted
    const referralResult = await db.select().from(Referral)
      .where(and(
        eq(Referral.referredWallet, walletLower),
        eq(Referral.clicked, true),
        eq(Referral.converted, false)
      ))
      .orderBy(desc(Referral.clickedAt))
      .limit(1);
    const referral = referralResult[0];

    if (!referral) {
      return; // No referral to convert
    }

    // Get user's FID from profile
    const userProfileResult = await db.select().from(UserProfile)
      .where(eq(UserProfile.wallet, walletLower))
      .limit(1);
    const userProfile = userProfileResult[0];

    // Mark referral as converted
    await db.update(Referral)
      .set({
        converted: true,
        convertedAt: new Date(),
        referredFid: userProfile?.farcasterFid || null,
      })
      .where(eq(Referral.id, referral.id));

    // Award points to the referrer
    if (referral.referrerWallet) {
      const referrerPointsResult = await db.select().from(UserPoints)
        .where(eq(UserPoints.wallet, referral.referrerWallet))
        .limit(1);
      const referrerPoints = referrerPointsResult[0];

      if (referrerPoints) {
        const referralPoints = 50; // Points for successful referral conversion
        await db.update(UserPoints)
          .set({
            totalPoints: referrerPoints.totalPoints + referralPoints,
          })
          .where(eq(UserPoints.wallet, referral.referrerWallet));

        // Create transaction record for referrer
        await db.insert(PointsTransaction).values({
          wallet: referral.referrerWallet,
          points: referralPoints,
          type: "referral",
          description: `Referral conversion - ${wallet.slice(0, 6)}...${wallet.slice(-4)} completed a quest`,
          referenceId: referral.id,
        });
      }
    }
  } catch (error) {
    // Don't throw - referral conversion should not fail the main operation
    console.error("Error converting referral:", error);
  }
}

/**
 * Award points to referrer when someone clicks their referral link
 */
export async function awardReferralClickPoints(referrerWallet: string | null, referrerFid: string): Promise<void> {
  try {
    if (!referrerWallet) {
      // Try to get wallet from FID
      const userProfileResult = await db.select().from(UserProfile)
        .where(eq(UserProfile.farcasterFid, referrerFid))
        .limit(1);
      const userProfile = userProfileResult[0];
      if (userProfile) {
        referrerWallet = userProfile.wallet;
      } else {
        return; // Can't award points without wallet
      }
    }

    if (!referrerWallet) return;

    const walletLower = referrerWallet.toLowerCase();
    // Find or create user points record
    const userPointsResult = await db.select().from(UserPoints)
      .where(eq(UserPoints.wallet, walletLower))
      .limit(1);
    let userPoints = userPointsResult[0];

    const REFERRAL_CLICK_POINTS = 100; // Points for referral link click

    if (!userPoints) {
      const [newPoints] = await db.insert(UserPoints).values({
        wallet: walletLower,
        totalPoints: REFERRAL_CLICK_POINTS,
      }).returning();
      userPoints = newPoints;
    } else {
      const [updatedPoints] = await db.update(UserPoints)
        .set({
          totalPoints: userPoints.totalPoints + REFERRAL_CLICK_POINTS,
        })
        .where(eq(UserPoints.wallet, walletLower))
        .returning();
      userPoints = updatedPoints;
    }

    // Create transaction record
    await db.insert(PointsTransaction).values({
      wallet: walletLower,
      points: REFERRAL_CLICK_POINTS,
      type: "referral",
      description: `Earned ${REFERRAL_CLICK_POINTS} points for referral link click`,
    });
  } catch (error) {
    // Don't throw - referral points should not fail the main operation
    console.error("Error awarding referral click points:", error);
  }
}

