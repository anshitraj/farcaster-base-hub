import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Promo } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const runtime = "edge";
export const dynamic = 'force-dynamic';

// PATCH /api/promos/[id]/click - Track click on promo (public)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Increment click count
    const [promo] = await db.update(Promo)
      .set({
        clicks: sql`${Promo.clicks} + 1`,
      })
      .where(eq(Promo.id, params.id))
      .returning();

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, clicks: promo.clicks });
  } catch (error: any) {
    console.error("Error tracking promo click:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}



