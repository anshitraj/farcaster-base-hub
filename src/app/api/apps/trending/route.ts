import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";

export async function GET() {
  try {
    // SIMPLIFIED: Just get ALL approved apps, prioritizing featured
    const apps = await prisma.miniApp.findMany({
      where: {
        status: "approved", // Only show approved apps
      },
      include: {
        events: true, // Include all events for scoring
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
        { featuredInBanner: "desc" }, // Featured apps FIRST
        { createdAt: "desc" }, // Then by creation date
      ],
      take: 20, // Get enough apps to work with
    });

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

    return NextResponse.json({ apps: result });
  } catch (error: any) {
    console.error("Get trending apps error:", error);
    // Return empty array instead of error to prevent UI breakage
    return NextResponse.json({ apps: [] });
  }
}

