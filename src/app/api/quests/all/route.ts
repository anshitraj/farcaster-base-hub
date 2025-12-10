import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { 
  AppLaunchEvent, 
  Review, 
  Developer,
  QuestCompletion,
  MiniApp,
  Collection,
  CollectionItem,
  UserPoints,
  Referral,
  UserProfile
} from "@/db/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 10; // Cache for 10 seconds

// Combined endpoint that returns all quest-related data in one call
export async function GET(request: NextRequest) {
  try {
    // Get wallet from cookie first (fastest path)
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    let wallet: string | null = cookieStore.get("walletAddress")?.value || null;
    
    if (!wallet) {
      const session = await getSessionFromCookies();
      wallet = session?.wallet || null;
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const walletLower = wallet.toLowerCase();

    // Get today's date (start of day in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(today);

    // Fetch all data in parallel for maximum performance
    const [
      developerResult,
      pointsResult,
      launchCountResult,
      launchTodayResult,
      questCompletions,
      userProfileResult
    ] = await Promise.all([
      // Get developer ID
      db.select({ id: Developer.id })
        .from(Developer)
        .where(eq(Developer.wallet, walletLower))
        .limit(1),
      // Get points
      db.select({ totalPoints: UserPoints.totalPoints })
        .from(UserPoints)
        .where(eq(UserPoints.wallet, walletLower))
        .limit(1),
      // Count app launches (all time)
      db.select({ count: count() })
        .from(AppLaunchEvent)
        .where(eq(AppLaunchEvent.wallet, walletLower)),
      // Count app launches today
      db.select({ count: count() })
        .from(AppLaunchEvent)
        .where(
          and(
            eq(AppLaunchEvent.wallet, walletLower),
            gte(AppLaunchEvent.createdAt, todayStart)
          )
        ),
      // Get quest completions
      db.select()
        .from(QuestCompletion)
        .where(eq(QuestCompletion.wallet, walletLower)),
      // Get user profile for FID
      db.select({ farcasterFid: UserProfile.farcasterFid })
        .from(UserProfile)
        .where(eq(UserProfile.wallet, walletLower))
        .limit(1)
    ]);

    const developerId = developerResult[0]?.id;
    const totalPoints = pointsResult[0]?.totalPoints || 0;
    const launchCount = launchCountResult[0]?.count || 0;
    const launchTodayCount = launchTodayResult[0]?.count || 0;
    const userProfile = userProfileResult[0];

    // Fetch dependent data in parallel
    const [
      reviewCountResult,
      reviewTodayResult,
      favoritesCollectionResult,
      submittedAppsResult
    ] = await Promise.all([
      // Count reviews (all time)
      developerId ? db.select({ count: count() })
        .from(Review)
        .where(eq(Review.developerId, developerId)) : Promise.resolve([{ count: 0 }]),
      // Count reviews today
      developerId ? db.select({ count: count() })
        .from(Review)
        .where(
          and(
            eq(Review.developerId, developerId),
            gte(Review.createdAt, todayStart)
          )
        ) : Promise.resolve([{ count: 0 }]),
      // Find user's favorites collection
      developerId ? db.select({ id: Collection.id })
        .from(Collection)
        .where(and(
          eq(Collection.developerId, developerId),
          eq(Collection.type, "favorites")
        ))
        .limit(1) : Promise.resolve([]),
      // Check if user has submitted an app
      developerId ? db.select({ count: count() })
        .from(MiniApp)
        .where(eq(MiniApp.developerId, developerId)) : Promise.resolve([{ count: 0 }])
    ]);

    const reviewCount = reviewCountResult[0]?.count || 0;
    const reviewTodayCount = reviewTodayResult[0]?.count || 0;
    const favoritesCollection = favoritesCollectionResult[0];
    const submittedApp = (submittedAppsResult[0]?.count || 0) > 0;

    // Get saved apps count
    let savedCount = 0;
    if (favoritesCollection) {
      const favoritesCountResult = await db
        .select({ count: count() })
        .from(CollectionItem)
        .where(eq(CollectionItem.collectionId, favoritesCollection.id));
      savedCount = Number(favoritesCountResult[0]?.count || 0);
    }

    // Get referral count if FID exists
    let referralCount = 0;
    if (userProfile?.farcasterFid) {
      const referralCountResult = await db
        .select({ count: count() })
        .from(Referral)
        .where(and(
          eq(Referral.referrerFid, String(userProfile.farcasterFid)),
          eq(Referral.converted, true)
        ));
      referralCount = Number(referralCountResult[0]?.count || 0);
    }

    // Build completion map
    const completionMap: Record<string, boolean> = {};
    questCompletions.forEach(qc => {
      const questDate = new Date(qc.completionDate);
      questDate.setUTCHours(0, 0, 0, 0);
      const isToday = questDate.getTime() === todayStart.getTime();
      
      if (qc.questId.startsWith("daily-")) {
        if (isToday) {
          completionMap[qc.questId] = true;
        }
      } else {
        completionMap[qc.questId] = true;
      }
    });

    // Check daily quest completions
    const dailyLaunchCompleted = launchTodayCount > 0 || completionMap["daily-launch"] === true;
    const dailyReviewCompleted = reviewTodayCount > 0 || completionMap["daily-review"] === true;

    // Calculate mission progress
    const starterMissionProgress = [
      launchCount > 0 || completionMap["launch"] === true,
      reviewCount > 0 || completionMap["review"] === true,
      savedCount > 0 || completionMap["save"] === true
    ].filter(Boolean).length;

    return NextResponse.json({
      wallet: walletLower,
      points: totalPoints,
      referralCount,
      quests: {
        launch: {
          progress: Math.min(launchCount, 1),
          maxProgress: 1,
          completed: launchCount > 0 || completionMap["launch"] === true,
        },
        review: {
          progress: Math.min(reviewCount, 1),
          maxProgress: 1,
          completed: reviewCount > 0 || completionMap["review"] === true,
        },
        save: {
          progress: Math.min(savedCount, 1),
          maxProgress: 1,
          completed: savedCount > 0 || completionMap["save"] === true,
        },
        "daily-launch": {
          progress: dailyLaunchCompleted ? 1 : 0,
          maxProgress: 1,
          completed: dailyLaunchCompleted,
        },
        "daily-review": {
          progress: dailyReviewCompleted ? 1 : 0,
          maxProgress: 1,
          completed: dailyReviewCompleted,
        },
        "launch-multiple": {
          progress: Math.min(launchCount, 5),
          maxProgress: 5,
          completed: launchCount >= 5 || completionMap["launch-multiple"] === true,
        },
        "rate-multiple": {
          progress: Math.min(reviewCount, 10),
          maxProgress: 10,
          completed: reviewCount >= 10 || completionMap["rate-multiple"] === true,
        },
        submit: {
          progress: submittedApp ? 1 : 0,
          maxProgress: 1,
          completed: submittedApp || completionMap["submit"] === true,
        },
      },
      missions: {
        starter: {
          progress: starterMissionProgress,
          totalQuests: 3,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10',
      },
    });
  } catch (error) {
    console.error("Error fetching quest data:", error);
    return NextResponse.json(
      { error: "Failed to fetch quest data" },
      { status: 500 }
    );
  }
}

