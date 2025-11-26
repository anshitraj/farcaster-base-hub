import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

const LAUNCH_XP_REWARD = 2;
const LAUNCH_COOLDOWN_MINUTES = 5;
const PREMIUM_XP_MULTIPLIER = 1.1; // +10% for premium users

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 }
      );
    }

    // Get session
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

    // Verify app exists
    const app = await prisma.miniApp.findUnique({
      where: { id: appId },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Check cooldown if wallet is available
    if (wallet) {
      const fiveMinutesAgo = new Date(Date.now() - LAUNCH_COOLDOWN_MINUTES * 60 * 1000);
      
      const recentLaunch = await prisma.appLaunchEvent.findFirst({
        where: {
          miniAppId: appId,
          wallet: wallet.toLowerCase(),
          createdAt: {
            gte: fiveMinutesAgo,
          },
        },
      });

      if (recentLaunch) {
        return NextResponse.json(
          {
            error: "Cooldown active",
            message: `You can earn XP again in ${LAUNCH_COOLDOWN_MINUTES} minutes`,
            xpEarned: 0,
          },
          { status: 429 }
        );
      }
    }

    // Create launch event
    await prisma.appLaunchEvent.create({
      data: {
        miniAppId: appId,
        wallet: wallet ? wallet.toLowerCase() : null,
      },
    });

    // Update app stats
    const updateData: any = {
      launchCount: { increment: 1 },
    };

    // Update unique users if wallet provided
    if (wallet) {
      const existingLaunch = await prisma.appLaunchEvent.findFirst({
        where: {
          miniAppId: appId,
          wallet: wallet.toLowerCase(),
        },
      });

      // If this is the first launch from this wallet, increment uniqueUsers
      if (!existingLaunch || existingLaunch.id === undefined) {
        // This is handled by the launch event creation above
        // We need to check if this wallet has launched before
        const previousLaunches = await prisma.appLaunchEvent.count({
          where: {
            miniAppId: appId,
            wallet: wallet.toLowerCase(),
          },
        });

        if (previousLaunches === 1) {
          // This is the first launch from this wallet
          updateData.uniqueUsers = { increment: 1 };
        }
      }
    }

    await prisma.miniApp.update({
      where: { id: appId },
      data: updateData,
    });

    // Award XP to user if wallet is available
    let xpAwarded = 0;
    if (wallet) {
      try {
        // Check if user has premium subscription
        const premiumSubscription = await prisma.premiumSubscription.findFirst({
          where: {
            wallet: wallet.toLowerCase(),
            status: "active",
            expiresAt: {
              gt: new Date(),
            },
          },
        });

        // Calculate XP with premium multiplier if applicable
        let xpToAward = LAUNCH_XP_REWARD;
        if (premiumSubscription) {
          xpToAward = Math.floor(LAUNCH_XP_REWARD * PREMIUM_XP_MULTIPLIER);
        }

        // Find or create user points
        let userPoints = await prisma.userPoints.findUnique({
          where: { wallet: wallet.toLowerCase() },
        });

        if (!userPoints) {
          userPoints = await prisma.userPoints.create({
            data: {
              wallet: wallet.toLowerCase(),
              totalPoints: xpToAward,
            },
          });
        } else {
          userPoints = await prisma.userPoints.update({
            where: { wallet: wallet.toLowerCase() },
            data: {
              totalPoints: { increment: xpToAward },
            },
          });
        }

        // Create transaction record
        await prisma.pointsTransaction.create({
          data: {
            wallet: wallet.toLowerCase(),
            points: xpToAward,
            type: premiumSubscription ? "launch_premium" : "launch",
            description: premiumSubscription
              ? `Earned ${xpToAward} XP (Premium +10%) for launching "${app.name}"`
              : `Earned ${xpToAward} XP for launching "${app.name}"`,
            referenceId: appId,
          },
        });

        xpAwarded = xpToAward;
      } catch (pointsError) {
        console.error("Error awarding launch XP:", pointsError);
        // Don't fail the launch if points system has an error
      }
    }

    // Award XP to developer
    if (app.developer) {
      try {
        const developerXP = 2; // Developer also gets XP when their app is launched
        
        await prisma.developer.update({
          where: { id: app.developer.id },
          data: {
            totalXP: { increment: developerXP },
          },
        });

        // Log XP for developer
        await prisma.xPLog.create({
          data: {
            developerId: app.developer.id,
            amount: developerXP,
            reason: "app_launch",
            referenceId: appId,
          },
        });
      } catch (xpError) {
        console.error("Error awarding developer XP:", xpError);
      }
    }

    return NextResponse.json({
      success: true,
      xpEarned: xpAwarded,
      message: xpAwarded > 0 ? `+${xpAwarded} XP earned for using a Mini App!` : undefined,
    });
  } catch (error: any) {
    console.error("Launch XP error:", error);
    return NextResponse.json(
      { error: "Failed to process launch", details: error.message },
      { status: 500 }
    );
  }
}

