import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  } catch (error) {
    console.error("Error fetching category counts:", error);
    return NextResponse.json({ counts: {} }, { status: 500 });
  }
}

