import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TopBaseApps, MiniApp, Developer } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // Fetch Top 30 from database
    const top30 = await db.select().from(TopBaseApps)
      .orderBy(asc(TopBaseApps.rank))
      .limit(30);

    // Try to match with existing MiniApps
    const appsWithMatches = await Promise.all(
      top30.map(async (topApp) => {
        const matchingAppResult = await db.select({
          app: MiniApp,
          developer: {
            id: Developer.id,
            wallet: Developer.wallet,
            name: Developer.name,
            verified: Developer.verified,
          },
        })
          .from(MiniApp)
          .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
          .where(eq(MiniApp.url, topApp.url))
          .limit(1);
        let matchingApp = matchingAppResult[0] ? {
          ...matchingAppResult[0].app,
          developer: matchingAppResult[0].developer,
        } : null;

        // Fix /uploads paths in matched app
        if (matchingApp) {
          let iconUrl = matchingApp.iconUrl;
          let headerImageUrl = matchingApp.headerImageUrl;
          
          if ((iconUrl?.startsWith("/uploads") || headerImageUrl?.startsWith("/uploads")) && matchingApp.farcasterJson) {
            try {
              const farcasterData = JSON.parse(matchingApp.farcasterJson);
              if (iconUrl?.startsWith("/uploads")) iconUrl = farcasterData.imageUrl || "/placeholder.svg";
              if (headerImageUrl?.startsWith("/uploads")) headerImageUrl = farcasterData.splashImageUrl || null;
            } catch (e) {
              if (iconUrl?.startsWith("/uploads")) iconUrl = "/placeholder.svg";
              if (headerImageUrl?.startsWith("/uploads")) headerImageUrl = null;
            }
          } else {
            if (iconUrl?.startsWith("/uploads")) iconUrl = "/placeholder.svg";
            if (headerImageUrl?.startsWith("/uploads")) headerImageUrl = null;
          }
          
          matchingApp = { ...matchingApp, iconUrl, headerImageUrl };
        }

        return {
          ...topApp,
          app: matchingApp,
        };
      })
    );

    return NextResponse.json({
      apps: appsWithMatches,
      total: top30.length,
    });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Get Top 30 error:", error.message);
      return NextResponse.json({ apps: [], total: 0 }, { status: 200 });
    }
    console.error("Get Top 30 error:", error);
    return NextResponse.json({ apps: [], total: 0 }, { status: 200 });
  }
}

