import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apps = await prisma.miniApp.findMany({
      where: {
        status: "approved",
      },
      select: {
        category: true,
      },
    });

    const counts: Record<string, number> = {};
    apps.forEach((app) => {
      counts[app.category] = (counts[app.category] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
      console.error("Error fetching category counts:", error.message);
      return NextResponse.json({ counts: {} }, { status: 200 });
    }
    console.error("Error fetching category counts:", error);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}
