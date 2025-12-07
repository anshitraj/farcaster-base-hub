import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator, requireAdminOnly } from "@/lib/admin";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";


export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const appsData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        verified: Developer.verified,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .orderBy(desc(MiniApp.createdAt));
    
    const apps = appsData.map(({ app, developer }) => ({ ...app, developer }));

    return NextResponse.json({ apps });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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

    // Check if app is being approved - create claimable badge
    const [existingApp] = await db.select().from(MiniApp).where(eq(MiniApp.id, appId)).limit(1);
    const isBeingApproved = existingApp && existingApp.status !== "approved" && updateData.status === "approved";
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

    const [app] = await db.update(MiniApp)
      .set(updateData)
      .where(eq(MiniApp.id, appId))
      .returning();

    // If app was just approved, create a claimable badge record
    if (isBeingApproved && app) {
      try {
        // Get developer
        const [developer] = await db.select()
          .from(Developer)
          .where(eq(Developer.id, app.developerId))
          .limit(1);

        if (developer) {
          // Check if badge already exists
          const existingBadge = await db.select()
            .from(Badge)
            .where(
              and(
                eq(Badge.appId, app.id),
                eq(Badge.developerId, developer.id)
              )
            )
            .limit(1);

          // Only create if it doesn't exist
          if (existingBadge.length === 0) {
            await db.insert(Badge).values({
              name: `${app.name} Builder Badge`,
              imageUrl: app.iconUrl || "",
              appName: app.name,
              appId: app.id,
              developerId: developer.id,
              claimed: false,
            });
          }
        }
      } catch (badgeError) {
        // Don't fail the approval if badge creation fails
        console.error("Error creating claimable badge:", badgeError);
      }
    }

    return NextResponse.json({ success: true, app });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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
    await db.delete(MiniApp).where(eq(MiniApp.id, appId));

    return NextResponse.json({ success: true, message: "App deleted successfully" });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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

