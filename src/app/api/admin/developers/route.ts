import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/admin";
import { Developer, MiniApp, Badge } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";


export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const developersData = await db.select().from(Developer)
      .orderBy(desc(Developer.createdAt));
    
    // Get counts for each developer
    const developers = await Promise.all(
      developersData.map(async (dev) => {
        const appsCountResult = await db.select({ count: count(MiniApp.id) })
          .from(MiniApp)
          .where(eq(MiniApp.developerId, dev.id));
        const badgesCountResult = await db.select({ count: count(Badge.id) })
          .from(Badge)
          .where(eq(Badge.developerId, dev.id));
        
        return {
          ...dev,
          _count: {
            apps: Number(appsCountResult[0]?.count || 0),
            badges: Number(badgesCountResult[0]?.count || 0),
          },
        };
      })
    );

    return NextResponse.json({ developers });
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

    const walletLower = wallet ? wallet.toLowerCase() : null;
    // Support both developerId and wallet for finding developers
    let developerResult;
    if (developerId && developerId.length === 36) {
      // UUID format - use as ID
      developerResult = await db.select().from(Developer)
        .where(eq(Developer.id, developerId))
        .limit(1);
    } else if (walletLower) {
      // Wallet address - use as wallet
      developerResult = await db.select().from(Developer)
        .where(eq(Developer.wallet, walletLower))
        .limit(1);
    } else if (developerId && developerId.startsWith("0x")) {
      // DeveloperId is actually a wallet address
      developerResult = await db.select().from(Developer)
        .where(eq(Developer.wallet, developerId.toLowerCase()))
        .limit(1);
    } else {
      return NextResponse.json(
        { error: "Developer ID or wallet is required" },
        { status: 400 }
      );
    }

    let developer = developerResult[0];

    if (!developer && walletLower) {
      // Create developer if they don't exist
      const [newDeveloper] = await db.insert(Developer).values({
        wallet: walletLower,
        adminRole: adminRole || null,
        verified: verified || false,
        verificationStatus: verified ? "verified" : "unverified",
      }).returning();
      developer = newDeveloper;
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

    const [updatedDeveloper] = await db.update(Developer)
      .set(updateData)
      .where(eq(Developer.id, developer.id))
      .returning();
    developer = updatedDeveloper;

    return NextResponse.json({ success: true, developer });
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

    console.error("Update developer error:", error);
    return NextResponse.json(
      { error: "Failed to update developer" },
      { status: 500 }
    );
  }
}

