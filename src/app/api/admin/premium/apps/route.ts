import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { Developer, PremiumApp, MiniApp } from "@/db/schema";
import { eq, desc } from "drizzle-orm";


export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const walletLower = wallet.toLowerCase();
    // Check if admin (premium features are admin-only)
    const developerResult = await db.select({ adminRole: Developer.adminRole })
      .from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer || developer.adminRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const premiumAppsData = await db.select({
      premiumApp: PremiumApp,
      app: MiniApp,
    })
      .from(PremiumApp)
      .leftJoin(MiniApp, eq(PremiumApp.miniAppId, MiniApp.id))
      .orderBy(desc(PremiumApp.addedAt));
    
    const premiumApps = premiumAppsData.map(({ premiumApp, app }) => ({
      ...premiumApp,
      miniApp: app,
    }));

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

    const walletLower = wallet.toLowerCase();
    // Check if admin (premium features are admin-only)
    const developerResult = await db.select({ adminRole: Developer.adminRole })
      .from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer || developer.adminRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { appId, featuredIn, onSale, salePrice } = body;

    if (!appId) {
      return NextResponse.json({ error: "appId is required" }, { status: 400 });
    }

    // Check if app exists
    const appResult = await db.select().from(MiniApp)
      .where(eq(MiniApp.id, appId))
      .limit(1);
    const app = appResult[0];

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Check if premium app exists
    const existingPremiumAppResult = await db.select().from(PremiumApp)
      .where(eq(PremiumApp.miniAppId, appId))
      .limit(1);
    const existingPremiumApp = existingPremiumAppResult[0];

    let premiumApp;
    if (existingPremiumApp) {
      // Update existing premium app
      const [updated] = await db.update(PremiumApp)
        .set({
          featuredIn: featuredIn || [],
          onSale: onSale || false,
          salePrice: salePrice || null,
        })
        .where(eq(PremiumApp.miniAppId, appId))
        .returning();
      premiumApp = updated;
    } else {
      // Create new premium app
      const [created] = await db.insert(PremiumApp).values({
        miniAppId: appId,
        featured: false,
        onSale: onSale || false,
        salePrice: salePrice || null,
        featuredIn: featuredIn || [],
        addedBy: walletLower,
      }).returning();
      premiumApp = created;
    }

    return NextResponse.json({ success: true, premiumApp });
  } catch (error: any) {
    console.error("Add premium app error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

