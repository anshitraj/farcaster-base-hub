import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";
import { MiniApp, Developer, AppEvent } from "@/db/schema";
import { eq, desc, inArray, and, gte } from "drizzle-orm";

// Cache trending apps for 60 seconds - use ISR instead of force-dynamic
export const revalidate = 60;
export const runtime = "edge";

export async function GET() {
  try {
    // SIMPLIFIED: Just get ALL approved apps, prioritizing featured
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
      .where(eq(MiniApp.status, "approved"))
      .orderBy(desc(MiniApp.featuredInBanner), desc(MiniApp.createdAt))
      .limit(20);

    // OPTIMIZE: Only fetch events from last 48 hours (used in trending calculation)
    // This dramatically reduces the amount of data fetched and processed
    const appIds = appsData.map(a => a.app.id);
    const eventsMap: Record<string, any[]> = {};
    if (appIds.length > 0) {
      const hours48 = 48 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - hours48);
      
      // Filter by time in database query instead of JavaScript - much faster!
      const events = await db.select().from(AppEvent)
        .where(
          and(
            inArray(AppEvent.miniAppId, appIds),
            gte(AppEvent.createdAt, cutoffDate)
          )
        );
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
      return NextResponse.json({ apps: [] });
    }

    // Separate featured and non-featured apps
    const featuredApps = apps.filter((app) => app.featuredInBanner);
    const nonFeaturedApps = apps.filter((app) => !app.featuredInBanner);

    // Compute trending scores
    const appsWithScores = apps.map((app) => ({
      app: app as MiniAppWithEvents,
      score: computeTrendingScore(app as MiniAppWithEvents),
    }));

    // Sort by score
    const sorted = appsWithScores.sort((a, b) => {
      // Featured apps always come first
      if (a.app.featuredInBanner && !b.app.featuredInBanner) return -1;
      if (!a.app.featuredInBanner && b.app.featuredInBanner) return 1;
      // Then by score
      return b.score - a.score;
    });
    
    // Always prioritize featured apps, then by score
    // If we have fewer than 10 apps, return all of them
    let trending;
    if (sorted.length <= 10) {
      trending = sorted;
    } else {
      // Get all featured apps first (they should already be first due to sorting)
      const featured = sorted.filter(({ app }) => app.featuredInBanner);
      const nonFeatured = sorted.filter(({ app }) => !app.featuredInBanner);
      
      // Take up to 10 apps: all featured + top non-featured
      trending = [...featured, ...nonFeatured].slice(0, 10);
    }
    
    const result = trending.map(({ app }) => ({
      ...app,
      topBaseRank: app.topBaseRank,
      autoUpdated: app.autoUpdated,
      contractVerified: app.contractVerified,
      developerTags: app.developerTags || [],
      tags: app.tags || [],
      headerImageUrl: app.headerImageUrl,
    }));

    const response = NextResponse.json({ apps: result });
    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Get trending apps error:", error.message);
      return NextResponse.json({ apps: [] }, { status: 200 });
    }
    console.error("Get trending apps error:", error);
    // Return empty array instead of error to prevent UI breakage
    return NextResponse.json({ apps: [] }, { status: 200 });
  }
}

