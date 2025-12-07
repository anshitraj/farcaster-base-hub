import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET() {
  try {
    const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities", "Shopping"];
    
    const counts = await Promise.all(
      categories.map(async (category) => {
        const countResult = await db.select({ count: count(MiniApp.id) })
          .from(MiniApp)
          .where(and(
            eq(MiniApp.category, category),
            eq(MiniApp.status, "approved")
          ));
        return { category, count: Number(countResult[0]?.count || 0) };
      })
    );

    return NextResponse.json({ counts });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Error fetching category counts:", error.message);
      return NextResponse.json({ counts: [] }, { status: 200 });
    }
    console.error("Error fetching category counts:", error);
    return NextResponse.json({ counts: [] }, { status: 200 });
  }
}

