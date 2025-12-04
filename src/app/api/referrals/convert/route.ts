import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

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

    // Get user's FID from profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    const referredFid = userProfile?.farcasterFid || null;

    // Find the referral record
    const referral = await prisma.referral.findFirst({
      where: {
        referrerFid: String(referrerFid),
        referredWallet: wallet.toLowerCase(),
        clicked: true,
        converted: false,
      },
      orderBy: {
        clickedAt: 'desc',
      },
    });

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Mark as converted
    const updated = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        converted: true,
        convertedAt: new Date(),
        referredFid: referredFid,
      },
    });

    // Award points to the referrer
    if (updated.referrerWallet) {
      const referrerPoints = await prisma.userPoints.findUnique({
        where: { wallet: updated.referrerWallet },
      });

      if (referrerPoints) {
        const pointsToAward = 50; // Points for successful referral conversion
        await prisma.userPoints.update({
          where: { wallet: updated.referrerWallet },
          data: {
            totalPoints: {
              increment: pointsToAward,
            },
          },
        });

        // Create transaction record
        await prisma.pointsTransaction.create({
          data: {
            wallet: updated.referrerWallet,
            points: pointsToAward,
            type: "referral",
            description: `Referral conversion - ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
            referenceId: updated.id,
          },
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

