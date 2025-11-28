import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireModerator } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    await requireModerator(); // Moderators can review pending apps

    const apps = await prisma.miniApp.findMany({
      where: {
        status: {
          in: ["pending", "pending_review", "pending_contract"], // Include all pending statuses
        },
      },
      include: {
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
            avatar: true,
            verified: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ apps });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    console.error("Get pending apps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending apps" },
      { status: 500 }
    );
  }
}

