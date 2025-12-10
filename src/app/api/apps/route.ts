import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";
import { MiniApp, Developer, AppEvent } from "@/db/schema";
import { eq, and, or, ilike, sql, desc, asc, count, inArray } from "drizzle-orm";

// Cache for 60 seconds using ISR
export const revalidate = 60;
export const runtime = "edge";

export async function GET(request: NextRequest) {
  // Extract params first so they're available in catch block
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const sort = searchParams.get("sort") || "newest";
  const limitParam = searchParams.get("limit") || "20";
  const offsetParam = searchParams.get("offset") || "0";
  const limit = parseInt(limitParam, 10) || 20;
  const offset = parseInt(offsetParam, 10) || 0;

  try {
    // Build where conditions
    const conditions = [eq(MiniApp.status, "approved")];

    if (search) {
      const searchLower = search.toLowerCase();
      conditions.push(
        or(
          ilike(MiniApp.name, `%${search}%`),
          ilike(MiniApp.description, `%${search}%`),
          ilike(MiniApp.category, `%${search}%`),
          sql`${sql.raw(`'${searchLower.replace(/'/g, "''")}'`)} = ANY(${MiniApp.tags}::text[])`
        )!
      );
    }

    if (category) {
      // Handle category mapping
      // "DeFi" should map to "Finance" category or tag
      if (category === "DeFi") {
        conditions.push(
          or(
            eq(MiniApp.category, "Finance"),
            sql`'defi' = ANY(${MiniApp.tags}::text[])`
          )!
        );
      } else {
        conditions.push(eq(MiniApp.category, category));
      }
    }

    if (tag) {
      conditions.push(sql`${sql.raw(`'${tag.replace(/'/g, "''")}'`)} = ANY(${MiniApp.tags}::text[])`);
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Build orderBy
    let orderByClause: any = desc(MiniApp.createdAt);
    let shouldRandomize = false;
    let shouldUseTrending = false;
    
    if (sort === "trending") {
      // For trending, we need to fetch apps with events and compute trending scores
      shouldUseTrending = true;
      orderByClause = desc(MiniApp.clicks); // Initial sort, will be overridden
    } else if (sort === "installs") {
      orderByClause = desc(MiniApp.installs);
    } else if (sort === "rating") {
      orderByClause = desc(MiniApp.ratingAverage);
    } else if (sort === "newest") {
      // For newest, we'll randomize to ensure fair distribution
      // This ensures new apps get equal visibility
      shouldRandomize = true;
      orderByClause = desc(MiniApp.createdAt);
    }

    // Fetch apps with developer info
    const fetchLimit = shouldRandomize ? Math.min(limit * 3, 100) : shouldUseTrending ? Math.min(limit * 2, 50) : limit;
    
    let appsQuery = db.select({
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
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(fetchLimit)
      .offset(offset);

    let appsData = await appsQuery;

    // Fetch events if needed for trending
    let eventsMap: Record<string, any[]> = {};
    if (shouldUseTrending) {
      const appIds = appsData.map(a => a.app.id);
      if (appIds.length > 0) {
        const events = await db.select().from(AppEvent)
          .where(inArray(AppEvent.miniAppId, appIds));
        events.forEach(event => {
          if (!eventsMap[event.miniAppId]) eventsMap[event.miniAppId] = [];
          eventsMap[event.miniAppId].push(event);
        });
      }
    }

    // Transform to match expected format and fix /uploads paths
    let apps = appsData.map(({ app, developer }) => {
      // Fix /uploads paths by falling back to original URLs from farcasterJson or placeholder
      let iconUrl = app.iconUrl;
      let headerImageUrl = app.headerImageUrl;
      let screenshots = app.screenshots || [];
      
      // Check if we need to fix any /uploads paths
      const hasUploadsPaths = iconUrl?.startsWith("/uploads") || 
                              headerImageUrl?.startsWith("/uploads") ||
                              (Array.isArray(screenshots) && screenshots.some((s: string) => s?.startsWith("/uploads")));
      
      if (hasUploadsPaths && app.farcasterJson) {
        try {
          const farcasterData = JSON.parse(app.farcasterJson);
          if (iconUrl?.startsWith("/uploads")) {
            iconUrl = farcasterData.imageUrl || "/placeholder.svg";
          }
          if (headerImageUrl?.startsWith("/uploads")) {
            headerImageUrl = farcasterData.splashImageUrl || null;
          }
          // Fix screenshots array
          if (Array.isArray(screenshots)) {
            screenshots = screenshots.map((screenshot: string) => {
              if (screenshot?.startsWith("/uploads/screenshots")) {
                return "/placeholder.svg";
              }
              return screenshot;
            });
          }
        } catch (e) {
          // Parsing failed, use placeholder
          if (iconUrl?.startsWith("/uploads")) iconUrl = "/placeholder.svg";
          if (headerImageUrl?.startsWith("/uploads")) headerImageUrl = null;
          // Fix screenshots array
          if (Array.isArray(screenshots)) {
            screenshots = screenshots.map((screenshot: string) => {
              if (screenshot?.startsWith("/uploads/screenshots")) {
                return "/placeholder.svg";
              }
              return screenshot;
            });
          }
        }
      } else if (hasUploadsPaths) {
        // No farcasterJson but has /uploads paths, use placeholder
        if (iconUrl?.startsWith("/uploads")) iconUrl = "/placeholder.svg";
        if (headerImageUrl?.startsWith("/uploads")) headerImageUrl = null;
        // Fix screenshots array
        if (Array.isArray(screenshots)) {
          screenshots = screenshots.map((screenshot: string) => {
            if (screenshot?.startsWith("/uploads/screenshots")) {
              return "/placeholder.svg";
            }
            return screenshot;
          });
        }
      }
      
      return {
        ...app,
        iconUrl,
        headerImageUrl,
        screenshots,
        developer,
        events: eventsMap[app.id] || [],
      };
    });

    // Fair randomization algorithm for newest apps
    // Similar to Play Store - ensures all new apps get visibility
    if (shouldRandomize && sort === "newest") {
      // Group apps by age buckets (0-1 day, 1-3 days, 3-7 days, etc.)
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      const buckets: { [key: string]: typeof apps } = {
        "0-1day": [],
        "1-3days": [],
        "3-7days": [],
        "7+days": [],
      };

      apps.forEach((app) => {
        const age = now - app.createdAt.getTime();
        if (age < oneDay) {
          buckets["0-1day"].push(app);
        } else if (age < threeDays) {
          buckets["1-3days"].push(app);
        } else if (age < sevenDays) {
          buckets["3-7days"].push(app);
        } else {
          buckets["7+days"].push(app);
        }
      });

      // Shuffle each bucket
      const shuffle = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Interleave apps from different buckets for fair distribution
      // This ensures newer apps get priority but older new apps still appear
      const interleaved: typeof apps = [];
      const maxLength = Math.max(
        buckets["0-1day"].length,
        buckets["1-3days"].length,
        buckets["3-7days"].length,
        buckets["7+days"].length
      );

      const shuffledBuckets = {
        "0-1day": shuffle(buckets["0-1day"]),
        "1-3days": shuffle(buckets["1-3days"]),
        "3-7days": shuffle(buckets["3-7days"]),
        "7+days": shuffle(buckets["7+days"]),
      };

      // Round-robin distribution: take one from each bucket in rotation
      for (let i = 0; i < maxLength && interleaved.length < limit; i++) {
        if (shuffledBuckets["0-1day"][i]) interleaved.push(shuffledBuckets["0-1day"][i]);
        if (interleaved.length >= limit) break;
        if (shuffledBuckets["1-3days"][i]) interleaved.push(shuffledBuckets["1-3days"][i]);
        if (interleaved.length >= limit) break;
        if (shuffledBuckets["3-7days"][i]) interleaved.push(shuffledBuckets["3-7days"][i]);
        if (interleaved.length >= limit) break;
        if (shuffledBuckets["7+days"][i]) interleaved.push(shuffledBuckets["7+days"][i]);
        if (interleaved.length >= limit) break;
      }

      // If we still have space, fill with remaining apps
      const remaining = [
        ...shuffledBuckets["0-1day"].slice(maxLength),
        ...shuffledBuckets["1-3days"].slice(maxLength),
        ...shuffledBuckets["3-7days"].slice(maxLength),
        ...shuffledBuckets["7+days"].slice(maxLength),
      ];

      for (const app of remaining) {
        if (interleaved.length >= limit) break;
        if (!interleaved.find((a) => a.id === app.id)) {
          interleaved.push(app);
        }
      }

      apps = interleaved.slice(0, limit);
    }

    // Handle trending sort
    if (shouldUseTrending && sort === "trending") {
      // Compute trending scores for all apps
      const appsWithScores = apps.map((app) => ({
        app: { ...app, events: app.events || [] } as MiniAppWithEvents,
        score: computeTrendingScore({ ...app, events: app.events || [] } as MiniAppWithEvents),
      }));

      // Sort by trending score (highest first)
      appsWithScores.sort((a, b) => b.score - a.score);

      // Take top apps and map back to app objects
      apps = appsWithScores.slice(0, limit).map(({ app }) => app) as any;
    }

    // Get total count
    const totalResult = await db.select({ count: count(MiniApp.id) }).from(MiniApp).where(whereClause);
    const total = Number(totalResult[0]?.count || 0);

    const response = NextResponse.json({
      apps: apps.map((app) => ({
        ...app,
        topBaseRank: app.topBaseRank,
        autoUpdated: app.autoUpdated,
        contractVerified: app.contractVerified,
        developerTags: app.developerTags || [],
      })),
      total,
      limit,
      offset,
    });

    // Aggressive caching for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300, max-age=60');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=300');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=300');
    return response;
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Get apps error:", error.message);
      return NextResponse.json({
        apps: [],
        total: 0,
        limit,
        offset,
      }, { status: 200 });
    }
    console.error("Get apps error:", error);
    // Return empty array instead of error to prevent UI breakage
    return NextResponse.json({
      apps: [],
      total: 0,
      limit,
      offset,
    }, { status: 200 });
  }
}

