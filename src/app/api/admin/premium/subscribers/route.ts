import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if admin (premium features are admin-only)
    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: { adminRole: true },
    });

    if (!developer || developer.adminRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const subscribers = await prisma.premiumSubscription.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ subscribers });
  } catch (error: any) {
    console.error("Get subscribers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

