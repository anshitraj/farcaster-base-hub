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
  CollectionItem
} from "@/db/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get wallet from session
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

    // Get developer ID for this wallet (to find reviews)
    const developerResult = await db
      .select({ id: Developer.id })
      .from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    
    const developerId = developerResult[0]?.id;

    // Count app launches (all time)
    const launchCountResult = await db
      .select({ count: count() })
      .from(AppLaunchEvent)
      .where(eq(AppLaunchEvent.wallet, walletLower));
    const launchCount = launchCountResult[0]?.count || 0;

    // Count app launches today
    const launchTodayResult = await db
      .select({ count: count() })
      .from(AppLaunchEvent)
      .where(
        and(
          eq(AppLaunchEvent.wallet, walletLower),
          gte(AppLaunchEvent.createdAt, todayStart)
        )
      );
    const launchTodayCount = launchTodayResult[0]?.count || 0;

    // Count reviews (all time)
    let reviewCount = 0;
    if (developerId) {
      const reviewCountResult = await db
        .select({ count: count() })
        .from(Review)
        .where(eq(Review.developerId, developerId));
      reviewCount = reviewCountResult[0]?.count || 0;
    }

    // Count reviews today
    let reviewTodayCount = 0;
    if (developerId) {
      const reviewTodayResult = await db
        .select({ count: count() })
        .from(Review)
        .where(
          and(
            eq(Review.developerId, developerId),
            gte(Review.createdAt, todayStart)
          )
        );
      reviewTodayCount = reviewTodayResult[0]?.count || 0;
    }

    // Count saved apps (favorites) - check CollectionItem for favorites collection
    let savedCount = 0;
    if (developerId) {
      // Find user's favorites collection
      const favoritesCollectionResult = await db
        .select({ id: Collection.id })
        .from(Collection)
        .where(and(
          eq(Collection.developerId, developerId),
          eq(Collection.type, "favorites")
        ))
        .limit(1);
      
      const favoritesCollection = favoritesCollectionResult[0];
      if (favoritesCollection) {
        const favoritesCountResult = await db
          .select({ count: count() })
          .from(CollectionItem)
          .where(eq(CollectionItem.collectionId, favoritesCollection.id));
        savedCount = Number(favoritesCountResult[0]?.count || 0);
      }
    }

    // Check if user has submitted an app (check if developer has any apps)
    let submittedApp = false;
    if (developerId) {
      const submittedAppsResult = await db
        .select({ count: count() })
        .from(MiniApp)
        .where(eq(MiniApp.developerId, developerId));
      submittedApp = (submittedAppsResult[0]?.count || 0) > 0;
    }

    // Check daily quest completions for today
    const dailyLaunchCompleted = launchTodayCount > 0;
    const dailyReviewCompleted = reviewTodayCount > 0;

    // Check if quests are completed (from QuestCompletion table)
    const questCompletions = await db
      .select()
      .from(QuestCompletion)
      .where(eq(QuestCompletion.wallet, walletLower));

    // Build completion map
    const completionMap: Record<string, boolean> = {};
    questCompletions.forEach(qc => {
      const questDate = new Date(qc.completionDate);
      questDate.setUTCHours(0, 0, 0, 0);
      const isToday = questDate.getTime() === todayStart.getTime();
      
      // For daily quests, only count if completed today
      if (qc.questId.startsWith("daily-")) {
        if (isToday) {
          completionMap[qc.questId] = true;
        }
      } else {
        // For non-daily quests, count if completed at all
        completionMap[qc.questId] = true;
      }
    });

    // Calculate mission progress
    const starterMissionProgress = [
      launchCount > 0 || completionMap["launch"] === true,
      reviewCount > 0 || completionMap["review"] === true,
      savedCount > 0 || completionMap["save"] === true
    ].filter(Boolean).length;

    return NextResponse.json({
      quests: {
        // Starter mission quests
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
        // Daily quests
        "daily-launch": {
          progress: dailyLaunchCompleted ? 1 : 0,
          maxProgress: 1,
          completed: dailyLaunchCompleted || completionMap["daily-launch"] === true,
        },
        "daily-review": {
          progress: dailyReviewCompleted ? 1 : 0,
          maxProgress: 1,
          completed: dailyReviewCompleted || completionMap["daily-review"] === true,
        },
        // Explorer mission quests
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
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("Error fetching quest progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch quest progress" },
      { status: 500 }
    );
  }
}

