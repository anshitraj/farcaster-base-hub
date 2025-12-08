import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { Developer, MiniApp, Review, CollectionItem, Collection } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      wallet = cookieStore.get("walletAddress")?.value || null;
    }

    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const walletLower = wallet.toLowerCase();
    // Find developer
    const developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json({ apps: [] });
    }

    // Fetch apps
    const appsData = await db.select().from(MiniApp)
      .where(eq(MiniApp.developerId, developer.id))
      .orderBy(desc(MiniApp.createdAt));

    // Format apps with stats
    const apps = await Promise.all(
      appsData.map(async (app) => {
        // Fetch reviews count
        const reviewsResult = await db.select({ rating: Review.rating })
          .from(Review)
          .where(eq(Review.miniAppId, app.id));
        
        // Fetch favorite count (collection items in favorites collections)
        const favoriteCollectionsResult = await db.select({ id: Collection.id })
          .from(Collection)
          .where(and(
            eq(Collection.developerId, developer.id),
            eq(Collection.type, "favorites")
          ));
        
        let favoriteCount = 0;
        if (favoriteCollectionsResult.length > 0) {
          const collectionIds = favoriteCollectionsResult.map(c => c.id);
          const favoriteItemsResult = await db.select()
            .from(CollectionItem)
            .where(and(
              eq(CollectionItem.appId, app.id),
              inArray(CollectionItem.collectionId, collectionIds)
            ));
          favoriteCount = favoriteItemsResult.length;
        }

        return {
          id: app.id,
          name: app.name,
          description: app.description,
          url: app.url,
          baseMiniAppUrl: app.baseMiniAppUrl,
          farcasterUrl: app.farcasterUrl,
          iconUrl: app.iconUrl,
          headerImageUrl: app.headerImageUrl,
          category: app.category,
          status: app.status,
          verified: app.verified,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          clicks: app.clicks,
          installs: app.installs,
          launchCount: app.launchCount,
          ratingAverage: app.ratingAverage,
          ratingCount: app.ratingCount,
          favoriteCount,
          tags: app.tags,
        };
      })
    );

    return NextResponse.json({ apps });
  } catch (error: any) {
    console.error("Error fetching developer apps:", error);
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch apps" },
      { status: 500 }
    );
  }
}

