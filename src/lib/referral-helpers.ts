import { prisma } from "@/lib/db";

/**
 * Convert a referral when a user completes a quest
 * This awards points to the referrer when the referred user completes any quest
 */
export async function convertReferralForUser(wallet: string): Promise<void> {
  try {
    // Check if user has a referral that needs to be converted
    const referral = await prisma.referral.findFirst({
      where: {
        referredWallet: wallet.toLowerCase(),
        clicked: true,
        converted: false,
      },
      orderBy: {
        clickedAt: 'desc',
      },
    });

    if (!referral) {
      return; // No referral to convert
    }

    // Get user's FID from profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    // Mark referral as converted
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        converted: true,
        convertedAt: new Date(),
        referredFid: userProfile?.farcasterFid || null,
      },
    });

    // Award points to the referrer
    if (referral.referrerWallet) {
      const referrerPoints = await prisma.userPoints.findUnique({
        where: { wallet: referral.referrerWallet },
      });

      if (referrerPoints) {
        const referralPoints = 50; // Points for successful referral conversion
        await prisma.userPoints.update({
          where: { wallet: referral.referrerWallet },
          data: {
            totalPoints: {
              increment: referralPoints,
            },
          },
        });

        // Create transaction record for referrer
        await prisma.pointsTransaction.create({
          data: {
            wallet: referral.referrerWallet,
            points: referralPoints,
            type: "referral",
            description: `Referral conversion - ${wallet.slice(0, 6)}...${wallet.slice(-4)} completed a quest`,
            referenceId: referral.id,
          },
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
      const userProfile = await prisma.userProfile.findFirst({
        where: { farcasterFid: referrerFid },
      });
      if (userProfile) {
        referrerWallet = userProfile.wallet;
      } else {
        return; // Can't award points without wallet
      }
    }

    if (!referrerWallet) return;

    // Find or create user points record
    let userPoints = await prisma.userPoints.findUnique({
      where: { wallet: referrerWallet.toLowerCase() },
    });

    const REFERRAL_CLICK_POINTS = 100; // Points for referral link click

    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: {
          wallet: referrerWallet.toLowerCase(),
          totalPoints: REFERRAL_CLICK_POINTS,
        },
      });
    } else {
      userPoints = await prisma.userPoints.update({
        where: { wallet: referrerWallet.toLowerCase() },
        data: {
          totalPoints: {
            increment: REFERRAL_CLICK_POINTS,
          },
        },
      });
    }

    // Create transaction record
    await prisma.pointsTransaction.create({
      data: {
        wallet: referrerWallet.toLowerCase(),
        points: REFERRAL_CLICK_POINTS,
        type: "referral",
        description: `Earned ${REFERRAL_CLICK_POINTS} points for referral link click`,
      },
    });
  } catch (error) {
    // Don't throw - referral points should not fail the main operation
    console.error("Error awarding referral click points:", error);
  }
}

