import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Debug endpoint to check what apps are in the database
export async function GET() {
  try {
    const allApps = await prisma.miniApp.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        featuredInBanner: true,
        url: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    const approvedApps = await prisma.miniApp.findMany({
      where: {
        status: "approved",
      },
      select: {
        id: true,
        name: true,
        status: true,
        featuredInBanner: true,
      },
    });

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

