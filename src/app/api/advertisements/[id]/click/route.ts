import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Advertisement } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST - Track advertisement click
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const adResult = await db.select().from(Advertisement).where(eq(Advertisement.id, id)).limit(1);
    const ad = adResult[0];
    if (ad) {
      await db.update(Advertisement)
        .set({ clickCount: ad.clickCount + 1 })
        .where(eq(Advertisement.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking click:", error);
    return NextResponse.json(
      { error: "Failed to track click", message: error.message },
      { status: 500 }
    );
  }
}

