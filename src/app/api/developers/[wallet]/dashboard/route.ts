import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Developer, MiniApp, Badge, Review } from "@/db/schema";
import { eq, sql, inArray, count } from "drizzle-orm";

export const runtime = "edge";
export const revalidate = 10; // Cache for 10 seconds (shorter cache for faster updates)
export const dynamic = 'force-dynamic'; // Ensure fresh data

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet.toLowerCase();

    const developerResult = await db.select().from(Developer).where(eq(Developer.wallet, wallet)).limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    // Optimize: Only select fields we need for dashboard (faster query)
    const apps = await db
      .select({
        id: MiniApp.id,
        name: MiniApp.name,
        clicks: MiniApp.clicks,
        installs: MiniApp.installs,
        ratingAverage: MiniApp.ratingAverage,
        ratingCount: MiniApp.ratingCount,
        status: MiniApp.status,
        url: MiniApp.url,
        monetizationEnabled: MiniApp.monetizationEnabled,
      })
      .from(MiniApp)
      .where(eq(MiniApp.developerId, developer.id));
    
    // Get all app IDs
    const appIds = apps.map(app => app.id);
    
    // Fetch review counts and badges in parallel (non-blocking)
    const [reviewCountsResult, badgesResult] = await Promise.all([
      appIds.length > 0
        ? db
            .select({
              miniAppId: Review.miniAppId,
              count: sql<number>`count(*)::int`.as('count'),
            })
            .from(Review)
            .where(inArray(Review.miniAppId, appIds))
            .groupBy(Review.miniAppId)
        : Promise.resolve([]),
      db
        .select({ id: Badge.id })
        .from(Badge)
        .where(eq(Badge.developerId, developer.id)),
    ]);
    
    // Build review counts map
    const reviewCountsMap: Record<string, number> = {};
    (reviewCountsResult || []).forEach((item: any) => {
      reviewCountsMap[item.miniAppId] = item.count;
    });

    // Calculate stats efficiently
    const totalApps = apps.length;
    const totalClicks = apps.reduce((sum, app) => sum + (app.clicks || 0), 0);
    const totalInstalls = apps.reduce((sum, app) => sum + (app.installs || 0), 0);
    
    const appsWithRatings = apps.filter((app) => (app.ratingCount || 0) > 0);
    const averageRating =
      appsWithRatings.length > 0
        ? appsWithRatings.reduce((sum, app) => sum + (app.ratingAverage || 0), 0) /
          appsWithRatings.length
        : 0;

    const badgesCount = badgesResult.length;

    // Format apps for dashboard (already optimized, no need to map again)
    const formattedApps = apps.map((app) => ({
      id: app.id,
      name: app.name,
      clicks: app.clicks || 0,
      installs: app.installs || 0,
      ratingAverage: app.ratingAverage || 0,
      ratingCount: app.ratingCount || 0,
      status: app.status,
      url: app.url,
      monetizationEnabled: app.monetizationEnabled || false,
    }));

    return NextResponse.json({
      totalApps,
      totalClicks,
      totalInstalls,
      averageRating,
      badgesCount,
      apps: formattedApps,
      // XP & Streak data
      streakCount: developer.streakCount || 0,
      lastClaimDate: developer.lastClaimDate,
      totalXP: developer.totalXP || 0,
      developerLevel: developer.developerLevel || 1,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}

