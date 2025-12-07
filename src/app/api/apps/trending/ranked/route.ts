import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp, Developer } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/**
 * Get trending apps ranked by:
 * 1. Number of reviews (ratingCount)
 * 2. Verification of builder (developer.verified)
 * 3. Most clicks (clicks)
 */

export const runtime = "edge";
export async function GET() {
  try {
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
      .orderBy(desc(MiniApp.ratingCount), desc(MiniApp.clicks))
      .limit(50);

    const apps = appsData.map(({ app, developer }) => ({
      ...app,
      developer,
    }));

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

    // Return top 50 trending apps
    const result = sorted.slice(0, 50).map(({ app }, index) => ({
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
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Get ranked trending apps error:", error.message);
      return NextResponse.json({ apps: [] }, { status: 200 });
    }
    console.error("Get ranked trending apps error:", error);
    return NextResponse.json({ apps: [] }, { status: 200 });
  }
}

