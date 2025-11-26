import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";

export async function GET() {
  try {
    // Fetch all apps with events (if no apps in last 7 days, return all)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const apps = await prisma.miniApp.findMany({
      where: {
        status: "approved", // Only show approved apps
      },
      include: {
        events: {
          where: {
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        },
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
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to recent 50 apps for trending calculation
    });

    // If no apps, return empty array
    if (apps.length === 0) {
      return NextResponse.json({ apps: [] });
    }

    // Compute trending scores
    const appsWithScores = apps.map((app) => ({
      app: app as MiniAppWithEvents,
      score: computeTrendingScore(app as MiniAppWithEvents),
    }));

    // Sort by score and return top 10
    const trending = appsWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ app }) => ({
        ...app,
        topBaseRank: app.topBaseRank,
        autoUpdated: app.autoUpdated,
        contractVerified: app.contractVerified,
        developerTags: app.developerTags || [],
      }));

    return NextResponse.json({ apps: trending });
  } catch (error: any) {
    console.error("Get trending apps error:", error);
    // Return empty array instead of error to prevent UI breakage
    return NextResponse.json({ apps: [] });
  }
}

