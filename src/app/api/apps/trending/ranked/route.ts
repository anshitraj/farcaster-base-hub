import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Get trending apps ranked by:
 * 1. Number of reviews (ratingCount)
 * 2. Verification of builder (developer.verified)
 * 3. Most clicks (clicks)
 */
export async function GET() {
  try {
    const apps = await prisma.miniApp.findMany({
      where: {
        status: "approved", // Only show approved apps
      },
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
      orderBy: [
        { ratingCount: "desc" }, // Sort by number of reviews first
        { clicks: "desc" }, // Then by clicks
      ],
      take: 50, // Get enough apps to rank
    });

    if (apps.length === 0) {
      return NextResponse.json({ apps: [] });
    }

    // Calculate a composite score for ranking
    // Formula: (ratingCount * 2) + (clicks * 0.1) + (verified developer bonus: 100)
    const appsWithScores = apps.map((app) => {
      const verifiedBonus = app.developer?.verified ? 100 : 0;
      const reviewScore = (app.ratingCount || 0) * 2;
      const clickScore = (app.clicks || 0) * 0.1;
      const score = reviewScore + clickScore + verifiedBonus;

      return {
        app,
        score,
      };
    });

    // Sort by composite score (highest first)
    const sorted = appsWithScores.sort((a, b) => {
      // Verified developers get priority
      if (a.app.developer?.verified && !b.app.developer?.verified) return -1;
      if (!a.app.developer?.verified && b.app.developer?.verified) return 1;
      // Then by score
      return b.score - a.score;
    });

    // Return top 20 trending apps
    const result = sorted.slice(0, 20).map(({ app }, index) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      iconUrl: app.iconUrl,
      headerImageUrl: app.headerImageUrl,
      category: app.category,
      tags: app.tags || [],
      ratingAverage: app.ratingAverage,
      ratingCount: app.ratingCount,
      clicks: app.clicks,
      installs: app.installs,
      developer: app.developer,
      rank: index + 1, // 1-based ranking
    }));

    return NextResponse.json({ apps: result });
  } catch (error: any) {
    console.error("Get ranked trending apps error:", error);
    return NextResponse.json({ apps: [] });
  }
}

