import { prisma } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";
import HomePageClient from "./HomePageClient";

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

async function getHomeData() {
  try {
    // Fetch trending apps directly from database
    const trendingApps = await prisma.miniApp.findMany({
      where: { status: "approved" },
      include: {
        events: true,
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
      },
      orderBy: [
        { featuredInBanner: "desc" },
        { createdAt: "desc" },
      ],
      take: 20,
    });

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
    const newApps = await prisma.miniApp.findMany({
      where: { status: "approved" },
      include: {
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

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
      featuredApps: topTrending.slice(0, 4),
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

  return <HomePageClient initialData={data} />;
}
