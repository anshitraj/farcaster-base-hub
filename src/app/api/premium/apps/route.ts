import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PremiumApp, MiniApp, Developer } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // Fetch premium apps from different categories
    const [premiumAppsData, gamesPlayingData, getStartedData, onSaleData] = await Promise.all([
      // All premium apps
      db.select({
        premiumApp: PremiumApp,
        app: MiniApp,
        developer: {
          id: Developer.id,
          wallet: Developer.wallet,
          name: Developer.name,
          avatar: Developer.avatar,
          verified: Developer.verified,
        },
      })
        .from(PremiumApp)
        .leftJoin(MiniApp, eq(PremiumApp.miniAppId, MiniApp.id))
        .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
        .where(eq(MiniApp.status, "approved"))
        .orderBy(desc(PremiumApp.addedAt))
        .limit(20),
      // Games We're Playing (featured in games_playing)
      db.select({
        premiumApp: PremiumApp,
        app: MiniApp,
        developer: {
          id: Developer.id,
          wallet: Developer.wallet,
          name: Developer.name,
          avatar: Developer.avatar,
          verified: Developer.verified,
        },
      })
        .from(PremiumApp)
        .leftJoin(MiniApp, eq(PremiumApp.miniAppId, MiniApp.id))
        .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
        .where(and(
          sql`'games_playing' = ANY(${PremiumApp.featuredIn})`,
          eq(MiniApp.status, "approved")
        ))
        .limit(10),
      // Get Started (featured in get_started)
      db.select({
        premiumApp: PremiumApp,
        app: MiniApp,
        developer: {
          id: Developer.id,
          wallet: Developer.wallet,
          name: Developer.name,
          avatar: Developer.avatar,
          verified: Developer.verified,
        },
      })
        .from(PremiumApp)
        .leftJoin(MiniApp, eq(PremiumApp.miniAppId, MiniApp.id))
        .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
        .where(and(
          sql`'get_started' = ANY(${PremiumApp.featuredIn})`,
          eq(MiniApp.status, "approved")
        ))
        .limit(6),
      // On Sale
      db.select({
        premiumApp: PremiumApp,
        app: MiniApp,
        developer: {
          id: Developer.id,
          wallet: Developer.wallet,
          name: Developer.name,
          avatar: Developer.avatar,
          verified: Developer.verified,
        },
      })
        .from(PremiumApp)
        .leftJoin(MiniApp, eq(PremiumApp.miniAppId, MiniApp.id))
        .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
        .where(and(
          eq(PremiumApp.onSale, true),
          eq(MiniApp.status, "approved")
        ))
        .limit(10),
    ]);

    const premiumApps = premiumAppsData.map(({ app, developer }) => ({ ...app, developer }));
    const gamesPlaying = gamesPlayingData.map(({ app, developer }) => ({ ...app, developer }));
    const getStarted = getStartedData.map(({ app, developer }) => ({ ...app, developer }));
    const onSale = onSaleData.map(({ premiumApp, app, developer }) => ({
      ...app,
      developer,
      salePrice: premiumApp.salePrice,
    }));

    return NextResponse.json({
      premiumApps,
      gamesPlaying,
      getStarted,
      onSale,
    });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Get premium apps error:", error.message);
      return NextResponse.json(
        {
          premiumApps: [],
          gamesPlaying: [],
          getStarted: [],
          onSale: [],
        },
        { status: 200 }
      );
    }
    console.error("Get premium apps error:", error);
    return NextResponse.json(
      {
        premiumApps: [],
        gamesPlaying: [],
        getStarted: [],
        onSale: [],
      },
      { status: 200 }
    );
  }
}

