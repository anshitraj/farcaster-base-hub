import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeTrendingScore, MiniAppWithEvents } from "@/lib/trending";

// Cache for 60 seconds, revalidate on demand
export const revalidate = 60;
export const dynamic = 'force-dynamic';

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

    // Build where clause
    const where: any = {
      status: "approved", // Only show approved apps
    };

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { tags: { has: searchLower } }, // Search in tags array
      ];
    }

    if (category) {
      // Handle category mapping
      // "DeFi" should map to "Finance" category or tag
      if (category === "DeFi") {
        where.OR = [
          { category: "Finance" },
          { tags: { has: "defi" } },
        ];
      } else {
        where.category = category;
      }
    }

    if (tag) {
      where.tags = { has: tag };
    }

    // Build orderBy
    let orderBy: any = { createdAt: "desc" };
    let shouldRandomize = false;
    let shouldUseTrending = false;
    
    if (sort === "trending") {
      // For trending, we need to fetch apps with events and compute trending scores
      shouldUseTrending = true;
      orderBy = { clicks: "desc" }; // Initial sort, will be overridden
    } else if (sort === "installs") {
      orderBy = { installs: "desc" };
    } else if (sort === "rating") {
      orderBy = { ratingAverage: "desc" };
    } else if (sort === "newest") {
      // For newest, we'll randomize to ensure fair distribution
      // This ensures new apps get equal visibility
      shouldRandomize = true;
      orderBy = { createdAt: "desc" };
    }

    // Build include object conditionally
    const includeObj: any = {
      developer: {
        select: {
          id: true,
          wallet: true,
          name: true,
          avatar: true,
          verified: true,
        },
      },
    };
    
    if (shouldUseTrending) {
      includeObj.events = true; // Include events for trending calculation
    }

    let apps = await prisma.miniApp.findMany({
      where,
      orderBy,
      take: shouldRandomize ? Math.min(limit * 3, 100) : shouldUseTrending ? Math.min(limit * 2, 50) : limit,
      skip: offset,
      include: includeObj,
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

    const total = await prisma.miniApp.count({ where });

    return NextResponse.json({
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
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
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

