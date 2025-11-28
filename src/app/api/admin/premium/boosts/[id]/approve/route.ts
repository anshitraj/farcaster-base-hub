import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const requestId = params.id;

    // Approve boost request
    const boostRequest = await prisma.boostRequest.update({
      where: { id: requestId },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: wallet.toLowerCase(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Apply boost to app (increase trending score)
    // This is a simplified version - you might want to add a boost multiplier
    await prisma.miniApp.update({
      where: { id: boostRequest.appId },
      data: {
        popularityScore: {
          increment: 100, // Boost score
        },
      },
    });

    return NextResponse.json({ success: true, boostRequest });
  } catch (error: any) {
    console.error("Approve boost error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

