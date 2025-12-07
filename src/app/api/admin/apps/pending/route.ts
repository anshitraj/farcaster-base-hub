import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/admin";
import { MiniApp, Developer } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    await requireModerator(); // Moderators can review pending apps

    const appsData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        avatar: Developer.avatar,
        verified: Developer.verified,
        verificationStatus: Developer.verificationStatus,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(inArray(MiniApp.status, ["pending", "pending_review", "pending_contract"]))
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

    console.error("Get pending apps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending apps" },
      { status: 500 }
    );
  }
}

