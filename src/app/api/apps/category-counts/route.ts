import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET() {
  try {
    const apps = await db.select({ category: MiniApp.category })
      .from(MiniApp)
      .where(eq(MiniApp.status, "approved"));

    const counts: Record<string, number> = {};
    apps.forEach((app) => {
      counts[app.category] = (counts[app.category] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      console.error("Error fetching category counts:", error.message);
      return NextResponse.json({ counts: {} }, { status: 200 });
    }
    console.error("Error fetching category counts:", error);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}
