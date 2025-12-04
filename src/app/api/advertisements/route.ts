import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET - Fetch active advertisements for public display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position") || "sidebar";

    const advertisements = await prisma.advertisement.findMany({
      where: {
        position,
        isActive: true,
      },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Increment view count for each ad (async, don't wait)
    advertisements.forEach((ad) => {
      prisma.advertisement.update({
        where: { id: ad.id },
        data: { viewCount: { increment: 1 } },
      }).catch(console.error);
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

