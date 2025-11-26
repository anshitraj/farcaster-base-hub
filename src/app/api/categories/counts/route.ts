import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];
    
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
  } catch (error) {
    console.error("Error fetching category counts:", error);
    return NextResponse.json({ counts: [] }, { status: 500 });
  }
}

