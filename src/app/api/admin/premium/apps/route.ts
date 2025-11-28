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

    const premiumApps = await prisma.premiumApp.findMany({
      include: {
        miniApp: true,
      },
      orderBy: {
        addedAt: "desc",
      },
    });

    return NextResponse.json({ apps: premiumApps });
  } catch (error: any) {
    console.error("Get premium apps error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { appId, featuredIn, onSale, salePrice } = body;

    if (!appId) {
      return NextResponse.json({ error: "appId is required" }, { status: 400 });
    }

    // Check if app exists
    const app = await prisma.miniApp.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Create or update premium app
    const premiumApp = await prisma.premiumApp.upsert({
      where: { miniAppId: appId },
      update: {
        featuredIn: featuredIn || [],
        onSale: onSale || false,
        salePrice: salePrice || null,
      },
      create: {
        miniAppId: appId,
        featured: false,
        onSale: onSale || false,
        salePrice: salePrice || null,
        featuredIn: featuredIn || [],
        addedBy: wallet.toLowerCase(),
      },
    });

    return NextResponse.json({ success: true, premiumApp });
  } catch (error: any) {
    console.error("Add premium app error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

