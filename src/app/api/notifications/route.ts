import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

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

    const where: any = { wallet: wallet.toLowerCase() };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // For developer notifications (app_updated), extract appId from link and fetch app info
    const notificationsWithAppInfo = await Promise.all(
      notifications.map(async (notif) => {
        if (notif.type === "app_updated" && notif.link) {
          // Extract appId from link (format: /apps/{appId})
          const appIdMatch = notif.link.match(/\/apps\/([a-f0-9-]+)/);
          if (appIdMatch && appIdMatch[1]) {
            try {
              const app = await prisma.miniApp.findUnique({
                where: { id: appIdMatch[1] },
                select: {
                  id: true,
                  name: true,
                  iconUrl: true,
                },
              });
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

    const unreadCount = await prisma.notification.count({
      where: {
        wallet: wallet.toLowerCase(),
        read: false,
      },
    });

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

