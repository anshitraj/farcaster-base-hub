import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * Check if user is admin
 */
async function checkAdmin() {
  const session = await getSessionFromCookies();
  if (!session || !session.wallet) {
    return null;
  }

  const adminWallet = process.env.ADMIN_WALLET?.toLowerCase();
  if (adminWallet && session.wallet.toLowerCase() === adminWallet) {
    return session.wallet;
  }

  try {
    const developer = await db.select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);
    
    if (developer[0]?.adminRole === "ADMIN") {
      return session.wallet;
    }
  } catch (e) {
    // Ignore errors
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const adminWallet = await checkAdmin();
    if (!adminWallet) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    // Get all approved apps where developer badge is not ready
    const apps = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(
        and(
          eq(MiniApp.status, "approved"),
          eq(MiniApp.developerBadgeReady, false)
        )
      )
      .orderBy(MiniApp.createdAt);

    return NextResponse.json({
      apps: apps.map(({ app, developer }) => ({
        id: app.id,
        name: app.name,
        description: app.description,
        iconUrl: app.iconUrl,
        category: app.category,
        status: app.status,
        createdAt: app.createdAt,
        developer: developer ? {
          id: developer.id,
          wallet: developer.wallet,
          name: developer.name,
        } : null,
      }))
    });
  } catch (error: any) {
    console.error("[Admin Badges Pending] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch pending badges",
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

