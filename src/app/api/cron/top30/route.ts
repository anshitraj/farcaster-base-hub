import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TopBaseApps, MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";

const CRON_SECRET = process.env.CRON_SECRET || "your-secret-token";
const TOP30_DATAFEED_URL = "https://raw.githubusercontent.com/anshitraj/base-gpt-datafeed/main/miniapps.json";

export const dynamic = 'force-dynamic';

interface Top30App {
  url: string;
  name: string;
  icon?: string;
  category?: string;
  launches?: number;
  clicks?: number;
  trendingScore?: number;
}


export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch Top 30 from datafeed
    const response = await fetch(TOP30_DATAFEED_URL, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch datafeed: ${response.statusText}`);
    }

    const datafeed = await response.json();
    
    // Extract apps and sort by score
    const apps: Top30App[] = Array.isArray(datafeed) ? datafeed : (datafeed.apps || []);
    
    // Calculate score for each app
    const appsWithScore = apps.map((app) => ({
      ...app,
      score: (app.launches || 0) * 0.4 + (app.clicks || 0) * 0.3 + (app.trendingScore || 0) * 0.3,
    }));

    // Sort by score descending
    appsWithScore.sort((a, b) => b.score - a.score);

    // Take top 30
    const top30 = appsWithScore.slice(0, 30);

    // Update database
    let syncedCount = 0;
    const errors: string[] = [];

    // Clear existing top 30
    await db.delete(TopBaseApps);

    // Insert new top 30
    for (let i = 0; i < top30.length; i++) {
      const app = top30[i];
      try {
        // Check if exists
        const existingResult = await db.select().from(TopBaseApps)
          .where(eq(TopBaseApps.url, app.url))
          .limit(1);
        const existing = existingResult[0];

        if (existing) {
          // Update
          await db.update(TopBaseApps)
            .set({
              name: app.name,
              icon: app.icon || null,
              category: app.category || null,
              score: Math.round(app.score),
              rank: i + 1,
              lastSynced: new Date(),
            })
            .where(eq(TopBaseApps.url, app.url));
        } else {
          // Create
          await db.insert(TopBaseApps).values({
            url: app.url,
            name: app.name,
            icon: app.icon || null,
            category: app.category || null,
            score: Math.round(app.score),
            rank: i + 1,
            lastSynced: new Date(),
          });
        }

        // Update corresponding MiniApp if it exists
        const existingAppResult = await db.select().from(MiniApp)
          .where(eq(MiniApp.url, app.url))
          .limit(1);
        const existingApp = existingAppResult[0];

        if (existingApp) {
          await db.update(MiniApp)
            .set({ topBaseRank: i + 1 })
            .where(eq(MiniApp.id, existingApp.id));
        }

        syncedCount++;
      } catch (error: any) {
        errors.push(`App ${app.name} (${app.url}): ${error.message}`);
        console.error(`Error syncing app ${app.url}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: top30.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Top 30 sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync Top 30", details: error.message },
      { status: 500 }
    );
  }
}

