import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities", "Shopping"];
    
    const counts = await Promise.all(
      categories.map(async (category) => {
        const count = await prisma.miniApp.count({
          where: {
            category,
            status: "approved",
          },
        });
        return { category, count };
      })
    );

    return NextResponse.json({ counts });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
      console.error("Error fetching category counts:", error.message);
      return NextResponse.json({ counts: [] }, { status: 200 });
    }
    console.error("Error fetching category counts:", error);
    return NextResponse.json({ counts: [] }, { status: 200 });
  }
}

