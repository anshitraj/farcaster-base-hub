import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Advertisement } from "@/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

// GET - Fetch active advertisements for public display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position") || "sidebar";

    const advertisements = await db.select()
      .from(Advertisement)
      .where(and(
        eq(Advertisement.position, position),
        eq(Advertisement.isActive, true)
      ))
      .orderBy(asc(Advertisement.order), desc(Advertisement.createdAt));

    // Increment view count for each ad (async, don't wait)
    advertisements.forEach((ad) => {
      db.update(Advertisement)
        .set({ viewCount: ad.viewCount + 1 })
        .where(eq(Advertisement.id, ad.id))
        .catch(console.error);
    });

    return NextResponse.json({ advertisements });
  } catch (error: any) {
    console.error("Error fetching advertisements:", error);
    return NextResponse.json(
      { error: "Failed to fetch advertisements", message: error.message },
      { status: 500 }
    );
  }
}

