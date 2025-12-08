import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { Notification, MiniApp } from "@/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const walletLower = wallet.toLowerCase();
    const conditions = [eq(Notification.wallet, walletLower)];
    if (unreadOnly) {
      conditions.push(eq(Notification.read, false));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const notifications = await db.select()
      .from(Notification)
      .where(whereClause)
      .orderBy(desc(Notification.createdAt))
      .limit(limit);

    // For developer notifications (app_updated), extract appId from link and fetch app info
    const notificationsWithAppInfo = await Promise.all(
      notifications.map(async (notif) => {
        if (notif.type === "app_updated" && notif.link) {
          // Extract appId from link (format: /apps/{appId})
          const appIdMatch = notif.link.match(/\/apps\/([a-f0-9-]+)/);
          if (appIdMatch && appIdMatch[1]) {
            try {
              const appResult = await db.select({
                id: MiniApp.id,
                name: MiniApp.name,
                iconUrl: MiniApp.iconUrl,
              })
                .from(MiniApp)
                .where(eq(MiniApp.id, appIdMatch[1]))
                .limit(1);
              const app = appResult[0];
              if (app) {
                return {
                  ...notif,
                  appId: app.id,
                  appName: app.name,
                  appIcon: app.iconUrl,
                };
              }
            } catch (error) {
              console.error("Error fetching app info for notification:", error);
            }
          }
        }
        return notif;
      })
    );

    const unreadCountResult = await db.select({ count: count(Notification.id) })
      .from(Notification)
      .where(and(
        eq(Notification.wallet, walletLower),
        eq(Notification.read, false)
      ));
    const unreadCount = Number(unreadCountResult[0]?.count || 0);

    return NextResponse.json({
      notifications: notificationsWithAppInfo,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

