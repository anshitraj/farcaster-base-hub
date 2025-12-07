import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";
import { MiniApp, Developer, AppEvent } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

/**
 * Calculate overall rank score for an app
 * Combines multiple factors for fair ranking
 */
function calculateRankScore(app: any, events: any[]): number {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Recent events (last 7 days) - weighted more
  const recentEvents = events.filter(
    (e) => e.createdAt.getTime() >= sevenDaysAgo
  );
  const olderEvents = events.filter(
    (e) => e.createdAt.getTime() >= thirtyDaysAgo && e.createdAt.getTime() < sevenDaysAgo
  );

  const recentClicks = recentEvents.filter((e) => e.type === "click").length;
  const recentInstalls = recentEvents.filter((e) => e.type === "install").length;
  const recentOpens = recentEvents.filter((e) => e.type === "open").length;
  
  const olderClicks = olderEvents.filter((e) => e.type === "click").length;
  const olderInstalls = olderEvents.filter((e) => e.type === "install").length;

  // Base score from engagement
  let score = 
    recentClicks * 1.0 +           // Recent clicks weighted highest
    recentInstalls * 2.0 +          // Installs are very valuable
    recentOpens * 0.5 +             // Opens show interest
    olderClicks * 0.3 +             // Older clicks still matter
    olderInstalls * 0.5;            // Older installs still matter

  // Rating boost (reviews are important for ranking)
  const ratingBoost = app.ratingAverage * app.ratingCount * 0.5;
  score += ratingBoost;

  // Review count boost (more reviews = more trust)
  const reviewBoost = Math.min(app.ratingCount * 2, 100); // Cap at 100
  score += reviewBoost;

  // Recency boost for new apps (first 7 days)
  const ageMs = now - app.createdAt.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (ageMs < sevenDaysMs) {
    score *= 1.3; // 30% boost for new apps
  }

  // Verified apps get a boost
  if (app.verified) {
    score *= 1.2;
  }

  // Contract verified apps get a boost
  if (app.contractVerified) {
    score *= 1.15;
  }

  return score;
}

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all approved apps
    const appsData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        avatar: Developer.avatar,
        verified: Developer.verified,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.status, "approved"));

    // Fetch events for all apps
    const appIds = appsData.map(a => a.app.id);
    const eventsMap: Record<string, any[]> = {};
    if (appIds.length > 0) {
      const events = await db.select().from(AppEvent)
        .where(and(
          inArray(AppEvent.miniAppId, appIds),
          gte(AppEvent.createdAt, thirtyDaysAgo)
        ));
      events.forEach(event => {
        if (!eventsMap[event.miniAppId]) eventsMap[event.miniAppId] = [];
        eventsMap[event.miniAppId].push(event);
      });
    }

    // Transform to match expected format
    const apps = appsData.map(({ app, developer }) => ({
      ...app,
      developer,
      events: eventsMap[app.id] || [],
    }));

    if (apps.length === 0) {
      return NextResponse.json({ apps: [], ranks: {} });
    }

    // Calculate rank scores for all apps
    const appsWithScores = apps.map((app) => ({
      app: app as any,
      rankScore: calculateRankScore(app, app.events || []),
    }));

    // Sort by rank score (descending)
    const sortedApps = appsWithScores.sort((a, b) => b.rankScore - a.rankScore);

    // Assign ranks (handle ties)
    const rankedApps: any[] = [];
    const ranks: Record<string, number> = {};
    let currentRank = 1;
    let previousScore = -1;

    for (let i = 0; i < sortedApps.length; i++) {
      const { app, rankScore } = sortedApps[i];
      
      // If score is different from previous, update rank
      if (Math.abs(rankScore - previousScore) > 0.001) {
        currentRank = i + 1;
      }
      
      ranks[app.id] = currentRank;
      previousScore = rankScore;

      rankedApps.push({
        ...app,
        rank: currentRank,
        rankScore,
        topBaseRank: app.topBaseRank || null,
        autoUpdated: app.autoUpdated || false,
        contractVerified: app.contractVerified || false,
        developerTags: app.developerTags || [],
      });
    }

    return NextResponse.json({
      apps: rankedApps,
      ranks, // Map of appId -> rank for quick lookups
    });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Get ranked apps error:", error.message);
      return NextResponse.json({ apps: [], ranks: {} }, { status: 200 });
    }
    console.error("Get ranked apps error:", error);
    return NextResponse.json({ apps: [], ranks: {} }, { status: 200 });
  }
}
