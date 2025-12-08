import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { MiniApp, Developer } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      wallet = cookieStore.get("walletAddress")?.value || null;
    }

    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appId = params.id;

    const walletLower = wallet.toLowerCase();
    // Verify app exists and belongs to developer
    const appResult = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, appId))
      .limit(1);
    const appData = appResult[0];

    if (!appData || !appData.app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    // Verify ownership
    if (!app.developer || app.developer.wallet.toLowerCase() !== walletLower) {
      return NextResponse.json(
        { error: "Unauthorized. You can only delete your own apps." },
        { status: 403 }
      );
    }

    // Delete app (cascade will handle related records)
    await db.delete(MiniApp).where(eq(MiniApp.id, appId));

    return NextResponse.json({ success: true, message: "App deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting app:", error);
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete app" },
      { status: 500 }
    );
  }
}

