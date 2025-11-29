import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const minRating = searchParams.get("minRating");
    const maxRating = searchParams.get("maxRating");
    const developer = searchParams.get("developer");
    const minLaunches = searchParams.get("minLaunches");
    const minTrending = searchParams.get("minTrending");
    const verified = searchParams.get("verified") === "true";
    const premium = searchParams.get("premium") === "true";
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const where: any = {
      status: "approved",
    };

    // Text search - includes name, description, and tags
    if (query) {
      const queryLower = query.toLowerCase();
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { has: queryLower } }, // Search in tags array
      ];
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Rating filters
    if (minRating) {
      where.ratingAverage = { gte: parseFloat(minRating) };
    }
    if (maxRating) {
      where.ratingAverage = {
        ...where.ratingAverage,
        lte: parseFloat(maxRating),
      };
    }

    // Developer filter
    if (developer) {
      where.developer = {
        wallet: { contains: developer, mode: "insensitive" },
      };
    }

    // Launch count filter
    if (minLaunches) {
      where.launchCount = { gte: parseInt(minLaunches, 10) };
    }

    // Trending score filter
    if (minTrending) {
      where.popularityScore = { gte: parseInt(minTrending, 10) };
    }

    // Verified filter
    if (verified) {
      where.verified = true;
    }

    // Premium filter
    if (premium) {
      where.premiumApp = { isNot: null };
    }

    // Tags filter
    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const [apps, total] = await Promise.all([
      prisma.miniApp.findMany({
        where,
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
          premiumApp: true,
        },
        orderBy: { popularityScore: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.miniApp.count({ where }),
    ]);

    return NextResponse.json({
      apps,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error searching apps:", error);
    return NextResponse.json(
      { error: "Failed to search apps" },
      { status: 500 }
    );
  }
}

