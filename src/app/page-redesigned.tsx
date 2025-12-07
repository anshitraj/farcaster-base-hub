import { db } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";
import HomePageRedesignedClient from "./HomePageRedesignedClient";
import { MiniApp, Developer, AppEvent } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

async function getHomeData() {
  try {
    // Fetch trending apps directly from database
    const trendingAppsData = await db.select({
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

    // Fetch events for trending calculation
    const appIds = trendingAppsData.map(a => a.app.id);
    const eventsMap: Record<string, any[]> = {};
    if (appIds.length > 0) {
      const events = await db.select().from(AppEvent)
        .where(inArray(AppEvent.miniAppId, appIds));
      events.forEach(event => {
        if (!eventsMap[event.miniAppId]) eventsMap[event.miniAppId] = [];
        eventsMap[event.miniAppId].push(event);
      });
    }

    // Transform to match expected format
    const trendingApps = trendingAppsData.map(({ app, developer }) => ({
      ...app,
      developer,
      events: eventsMap[app.id] || [],
    }));

    // Compute trending scores
    const appsWithScores = trendingApps.map((app) => ({
      app: app as MiniAppWithEvents,
      score: computeTrendingScore(app as MiniAppWithEvents),
    }));

    const sorted = appsWithScores.sort((a, b) => {
      if (a.app.featuredInBanner && !b.app.featuredInBanner) return -1;
      if (!a.app.featuredInBanner && b.app.featuredInBanner) return 1;
      return b.score - a.score;
    });

    const topTrending = sorted.slice(0, 5).map(({ app }) => ({
      ...app,
      topBaseRank: app.topBaseRank,
      autoUpdated: app.autoUpdated,
      contractVerified: app.contractVerified,
      developerTags: app.developerTags || [],
      tags: app.tags || [],
    }));

    // Fetch new apps
    const newAppsData = await db.select({
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
      .orderBy(desc(MiniApp.createdAt))
      .limit(6);
    
    const newApps = newAppsData.map(({ app, developer }) => ({
      ...app,
      developer,
    }));

    return {
      trendingApps: topTrending,
      newApps: newApps.map((app) => ({
        ...app,
        topBaseRank: app.topBaseRank,
        autoUpdated: app.autoUpdated,
        contractVerified: app.contractVerified,
        developerTags: app.developerTags || [],
        tags: app.tags || [],
      })),
      featuredApps: topTrending.slice(0, 5),
    };
  } catch (error: any) {
    console.error("Error fetching home data:", error);
    return {
      trendingApps: [],
      newApps: [],
      featuredApps: [],
    };
  }
}

export default async function HomePage() {
  const data = await getHomeData();

  return <HomePageRedesignedClient initialData={data} />;
}
