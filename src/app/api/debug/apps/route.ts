import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Debug endpoint to check what apps are in the database

export const runtime = "edge";
export async function GET() {
  try {
    const allApps = await db.select({
      id: MiniApp.id,
      name: MiniApp.name,
      status: MiniApp.status,
      featuredInBanner: MiniApp.featuredInBanner,
      url: MiniApp.url,
      createdAt: MiniApp.createdAt,
    })
      .from(MiniApp)
      .orderBy(desc(MiniApp.createdAt))
      .limit(20);

    const approvedApps = await db.select({
      id: MiniApp.id,
      name: MiniApp.name,
      status: MiniApp.status,
      featuredInBanner: MiniApp.featuredInBanner,
    })
      .from(MiniApp)
      .where(eq(MiniApp.status, "approved"));

    return NextResponse.json({
      total: allApps.length,
      approved: approvedApps.length,
      featured: approvedApps.filter(a => a.featuredInBanner).length,
      allApps: allApps,
      approvedApps: approvedApps,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

