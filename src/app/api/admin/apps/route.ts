import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireModerator, requireAdminOnly } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const apps = await prisma.miniApp.findMany({
      include: {
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
            verified: true,
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

    console.error("Get apps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch apps" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireModerator();

    const body = await request.json();
    const { appId, verified, status, name, description, url, baseMiniAppUrl, farcasterUrl, iconUrl, headerImageUrl, category, contractVerified, featuredInBanner, screenshots } = body;

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof verified === "boolean") {
      updateData.verified = verified;
    }
    if (status && ["pending", "pending_review", "pending_contract", "approved", "rejected"].includes(status)) {
      updateData.status = status;
    }
    // Allow editing app details
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (url) {
      if (!url.startsWith("https://")) {
        return NextResponse.json(
          { error: "URL must use HTTPS" },
          { status: 400 }
        );
      }
      updateData.url = url;
    }
    if (baseMiniAppUrl !== undefined) updateData.baseMiniAppUrl = baseMiniAppUrl || null;
    if (farcasterUrl !== undefined) updateData.farcasterUrl = farcasterUrl || null;
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl || null;
    if (headerImageUrl !== undefined) updateData.headerImageUrl = headerImageUrl || null;
    if (category) updateData.category = category;
    if (typeof contractVerified === "boolean") {
      updateData.contractVerified = contractVerified;
      // If contract is verified, also verify the app
      if (contractVerified) {
        updateData.verified = true;
        if (status === "pending_contract") {
          updateData.status = "approved";
        }
      }
    }
    if (typeof featuredInBanner === "boolean") {
      updateData.featuredInBanner = featuredInBanner;
    }
    if (Array.isArray(screenshots)) {
      updateData.screenshots = screenshots;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 }
      );
    }

    const app = await prisma.miniApp.update({
      where: { id: appId },
      data: updateData,
    });

    return NextResponse.json({ success: true, app });
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

    console.error("Update app error:", error);
    return NextResponse.json(
      { error: "Failed to update app" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminOnly(); // Only admins can delete apps

    const searchParams = request.nextUrl.searchParams;
    const appId = searchParams.get("appId");

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 }
      );
    }

    // Delete the app (cascade will handle related records)
    await prisma.miniApp.delete({
      where: { id: appId },
    });

    return NextResponse.json({ success: true, message: "App deleted successfully" });
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

    console.error("Delete app error:", error);
    return NextResponse.json(
      { error: "Failed to delete app" },
      { status: 500 }
    );
  }
}

