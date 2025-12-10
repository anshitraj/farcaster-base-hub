import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { convertReferralForUser } from "@/lib/referral-helpers";
import { trackQuestCompletion } from "@/lib/quest-helpers";
import { MiniApp, Developer, AppLaunchEvent, PremiumSubscription, UserPoints, PointsTransaction, XPLog } from "@/db/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";

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
    const appResult = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, appId))
      .limit(1);
    const appData = appResult[0];

    if (!appData || !appData.app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    // Check cooldown if wallet is available
    let previousLaunchCount = 0;
    if (wallet) {
      const fiveMinutesAgo = new Date(Date.now() - LAUNCH_COOLDOWN_MINUTES * 60 * 1000);
      const walletLower = wallet.toLowerCase();
      
      const recentLaunchResult = await db.select().from(AppLaunchEvent)
        .where(and(
          eq(AppLaunchEvent.miniAppId, appId),
          eq(AppLaunchEvent.wallet, walletLower),
          gte(AppLaunchEvent.createdAt, fiveMinutesAgo)
        ))
        .limit(1);
      const recentLaunch = recentLaunchResult[0];

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

      // Check previous launch count BEFORE inserting (for quest tracking)
      const previousLaunchesResult = await db.select({ count: count() })
        .from(AppLaunchEvent)
        .where(eq(AppLaunchEvent.wallet, walletLower));
      previousLaunchCount = Number(previousLaunchesResult[0]?.count || 0);
    }

    // Create launch event
    await db.insert(AppLaunchEvent).values({
      miniAppId: appId,
      wallet: wallet ? wallet.toLowerCase() : null,
    });

    // Update app stats
    const appUpdateResult = await db.select().from(MiniApp).where(eq(MiniApp.id, appId)).limit(1);
    const currentApp = appUpdateResult[0];
    
    // Update unique users if wallet provided
    let uniqueUsersIncrement = 0;
    if (wallet) {
      const walletLower = wallet.toLowerCase();
      const previousLaunchesResult = await db.select({ count: count() })
        .from(AppLaunchEvent)
        .where(and(
          eq(AppLaunchEvent.miniAppId, appId),
          eq(AppLaunchEvent.wallet, walletLower)
        ));
      const previousLaunches = Number(previousLaunchesResult[0]?.count || 0);

      if (previousLaunches === 1) {
        // This is the first launch from this wallet
        uniqueUsersIncrement = 1;
      }
    }

    await db.update(MiniApp)
      .set({
        launchCount: currentApp.launchCount + 1,
        uniqueUsers: currentApp.uniqueUsers + uniqueUsersIncrement,
      })
      .where(eq(MiniApp.id, appId));

    // Award XP to user if wallet is available
    let xpAwarded = 0;
    if (wallet) {
      try {
        const walletLower = wallet.toLowerCase();
        // Check if user has premium subscription
        const premiumResult = await db.select().from(PremiumSubscription)
          .where(and(
            eq(PremiumSubscription.wallet, walletLower),
            eq(PremiumSubscription.status, "active"),
            sql`${PremiumSubscription.expiresAt} > NOW()`
          ))
          .limit(1);
        const premiumSubscription = premiumResult[0];

        // Calculate XP with premium multiplier if applicable
        let xpToAward = LAUNCH_XP_REWARD;
        if (premiumSubscription) {
          xpToAward = Math.floor(LAUNCH_XP_REWARD * PREMIUM_XP_MULTIPLIER);
        }

        // Find or create user points
        let userPointsResult = await db.select().from(UserPoints)
          .where(eq(UserPoints.wallet, walletLower))
          .limit(1);
        let userPoints = userPointsResult[0];

        if (!userPoints) {
          const [newPoints] = await db.insert(UserPoints).values({
            wallet: walletLower,
            totalPoints: xpToAward,
          }).returning();
          userPoints = newPoints;
        } else {
          const [updatedPoints] = await db.update(UserPoints)
            .set({
              totalPoints: userPoints.totalPoints + xpToAward,
            })
            .where(eq(UserPoints.wallet, walletLower))
            .returning();
          userPoints = updatedPoints;
        }

        // Create transaction record
        await db.insert(PointsTransaction).values({
          wallet: walletLower,
          points: xpToAward,
          type: premiumSubscription ? "launch_premium" : "launch",
          description: premiumSubscription
            ? `Earned ${xpToAward} XP (Premium +10%) for launching "${app.name}"`
            : `Earned ${xpToAward} XP for launching "${app.name}"`,
          referenceId: appId,
        });

        xpAwarded = xpToAward;

        // Convert referral if user came from a referral link
        await convertReferralForUser(wallet);

        // Track quest completions
        try {
          // This launch makes it previousLaunchCount + 1
          const totalLaunches = previousLaunchCount + 1;
          
          if (totalLaunches === 1) {
            // First launch - complete "launch" quest
            await trackQuestCompletion(wallet, "launch");
          }
          
          // Check if this is the 5th launch (for "launch-multiple" quest)
          if (totalLaunches === 5) {
            await trackQuestCompletion(wallet, "launch-multiple");
          }

          // Track daily launch quest (always try, function handles duplicates)
          await trackQuestCompletion(wallet, "daily-launch");
        } catch (questError) {
          console.error("Error tracking quest completion:", questError);
          // Don't fail the launch if quest tracking has an error
        }
      } catch (pointsError) {
        console.error("Error awarding launch XP:", pointsError);
        // Don't fail the launch if points system has an error
      }
    }

    // Award XP to developer
    if (app.developer) {
      try {
        const developerXP = 2; // Developer also gets XP when their app is launched
        
        const devResult = await db.select().from(Developer).where(eq(Developer.id, app.developer.id)).limit(1);
        const currentDev = devResult[0];
        
        await db.update(Developer)
          .set({
            totalXP: (currentDev.totalXP || 0) + developerXP,
          })
          .where(eq(Developer.id, app.developer.id));

        // Log XP for developer
        await db.insert(XPLog).values({
          developerId: app.developer.id,
          amount: developerXP,
          reason: "app_launch",
          referenceId: appId,
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

