import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp, Developer, PremiumApp } from "@/db/schema";
import { eq, and, or, ilike, gte, lte, sql, count, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

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

    // Build where conditions
    const conditions = [eq(MiniApp.status, "approved")];

    // Text search - includes name, description, and tags
    if (query) {
      const queryLower = query.toLowerCase();
      const searchConditions = [
        ilike(MiniApp.name, `%${query}%`),
        ilike(MiniApp.description, `%${query}%`),
        sql`${sql.raw(`'${queryLower.replace(/'/g, "''")}'`)} = ANY(${MiniApp.tags})`,
      ];
      conditions.push(or(...searchConditions)!);
    }

    // Category filter
    if (category) {
      conditions.push(eq(MiniApp.category, category));
    }

    // Rating filters
    if (minRating) {
      conditions.push(gte(MiniApp.ratingAverage, parseFloat(minRating)));
    }
    if (maxRating) {
      conditions.push(lte(MiniApp.ratingAverage, parseFloat(maxRating)));
    }

    // Launch count filter
    if (minLaunches) {
      conditions.push(gte(MiniApp.launchCount, parseInt(minLaunches, 10)));
    }

    // Trending score filter
    if (minTrending) {
      conditions.push(gte(MiniApp.popularityScore, parseInt(minTrending, 10)));
    }

    // Verified filter
    if (verified) {
      conditions.push(eq(MiniApp.verified, true));
    }

    // Tags filter
    if (tags.length > 0) {
      const tagConditions = tags.map(tag => 
        sql`${sql.raw(`'${tag.toLowerCase().replace(/'/g, "''")}'`)} = ANY(${MiniApp.tags})`
      );
      conditions.push(or(...tagConditions)!);
    }

    // Developer filter - add to conditions if present
    if (developer) {
      // We'll need to join Developer table, so add condition later after join
    }

    // Premium filter - add to conditions if present
    if (premium) {
      // We'll need to join PremiumApp table, so add condition later after join
    }

    const baseWhereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Build final where clause with all joins
    let finalConditions = [baseWhereClause];
    if (developer) {
      finalConditions.push(ilike(Developer.wallet, `%${developer}%`));
    }
    if (premium) {
      finalConditions.push(sql`${PremiumApp.id} IS NOT NULL`);
    }
    const whereClause = finalConditions.length > 1 ? and(...finalConditions) : finalConditions[0];

    // Get total count
    const totalResult = await db.select({ count: count(MiniApp.id) })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .leftJoin(PremiumApp, eq(MiniApp.id, PremiumApp.miniAppId))
      .where(whereClause);
    const total = Number(totalResult[0]?.count || 0);

    // Get apps with pagination
    const appsData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        avatar: Developer.avatar,
        verified: Developer.verified,
      },
      premiumApp: PremiumApp,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .leftJoin(PremiumApp, eq(MiniApp.id, PremiumApp.miniAppId))
      .where(whereClause)
      .orderBy(desc(MiniApp.popularityScore))
      .limit(limit)
      .offset(offset);

    const apps = appsData.map(({ app, developer, premiumApp }) => ({
      ...app,
      developer,
      premiumApp,
    }));

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

