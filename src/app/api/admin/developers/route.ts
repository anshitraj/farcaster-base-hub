import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireModerator } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const developers = await prisma.developer.findMany({
      include: {
        _count: {
          select: {
            apps: true,
            badges: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ developers });
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

    console.error("Get developers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch developers" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { requireAdminOnly } = await import("@/lib/admin");
    await requireAdminOnly(); // Only admins can manage other admins/moderators

    const body = await request.json();
    const { developerId, wallet, verified, adminRole } = body;

    // Support both developerId and wallet for finding developers
    let whereClause: any;
    if (developerId && developerId.length === 36) {
      // UUID format - use as ID
      whereClause = { id: developerId };
    } else if (wallet) {
      // Wallet address - use as wallet
      whereClause = { wallet: wallet.toLowerCase() };
    } else if (developerId && developerId.startsWith("0x")) {
      // DeveloperId is actually a wallet address
      whereClause = { wallet: developerId.toLowerCase() };
    } else {
      return NextResponse.json(
        { error: "Developer ID or wallet is required" },
        { status: 400 }
      );
    }

    // Find or create developer if using wallet
    let developer = await prisma.developer.findUnique({
      where: whereClause,
    });

    if (!developer && wallet) {
      // Create developer if they don't exist
      developer = await prisma.developer.create({
        data: {
          wallet: wallet.toLowerCase(),
          adminRole: adminRole || null,
          verified: verified || false,
          verificationStatus: verified ? "verified" : "unverified",
        },
      });
    } else if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (typeof verified === "boolean") {
      updateData.verified = verified;
      if (verified) {
        updateData.verificationStatus = "verified";
      }
    }
    // Only admins can change admin roles
    if (adminRole !== undefined) {
      if (adminRole === null || adminRole === "ADMIN" || adminRole === "MODERATOR") {
        updateData.adminRole = adminRole;
      }
    }

    developer = await prisma.developer.update({
      where: { id: developer.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, developer });
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

    console.error("Update developer error:", error);
    return NextResponse.json(
      { error: "Failed to update developer" },
      { status: 500 }
    );
  }
}

