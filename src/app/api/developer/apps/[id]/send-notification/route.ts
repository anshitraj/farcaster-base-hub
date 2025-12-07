import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { MiniApp, Developer, CollectionItem, Collection, Notification } from "@/db/schema";
import { eq, and, inArray, sql, ilike } from "drizzle-orm";
import { z } from "zod";

const sendNotificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  message: z.string().min(1, "Message is required").max(500, "Message must be less than 500 characters"),
  link: z.string().optional().refine(
    (val) => {
      if (!val || val === '') return true; // Optional, empty is fine
      // Accept full URLs or paths starting with /
      return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
    },
    { message: "Link must be a valid URL (http:// or https://) or a path starting with /" }
  ),
});

export const dynamic = 'force-dynamic';

export async function POST(
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
    const body = await request.json();
    const validated = sendNotificationSchema.parse(body);

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
    
    if (!appData) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    // Verify ownership
    if (!app.developer || app.developer.wallet.toLowerCase() !== walletLower) {
      return NextResponse.json(
        { error: "Unauthorized. You can only send notifications for your own apps." },
        { status: 403 }
      );
    }

    // Get all users who have favorited this app
    const favoriteCollectionsData = await db.select({
      item: CollectionItem,
      collection: Collection,
      developer: Developer,
    })
      .from(CollectionItem)
      .leftJoin(Collection, eq(CollectionItem.collectionId, Collection.id))
      .leftJoin(Developer, eq(Collection.developerId, Developer.id))
      .where(and(
        eq(CollectionItem.appId, appId),
        eq(Collection.type, "favorites")
      ));

    // Get unique wallets (users who favorited)
    const userWallets = new Set<string>();
    favoriteCollectionsData.forEach((item) => {
      if (item.developer?.wallet) {
        userWallets.add(item.developer.wallet.toLowerCase());
      }
    });

    if (userWallets.size === 0) {
      return NextResponse.json({
        success: true,
        message: "No users have favorited this app yet.",
        sentCount: 0,
      });
    }

    // Rate limiting: 1 notification per developer per user per app
    const userWalletsArray = Array.from(userWallets);
    const existingNotificationsResult = await db.select({ wallet: Notification.wallet })
      .from(Notification)
      .where(and(
        inArray(Notification.wallet, userWalletsArray),
        eq(Notification.type, "app_updated"),
        sql`${Notification.link} LIKE ${`%/apps/${appId}%`}`
      ));

    // Create a set of wallets that already received a notification for this app
    const notifiedWallets = new Set(existingNotificationsResult.map(n => n.wallet.toLowerCase()));
    
    // Filter out users who already received a notification for this app
    const walletsToNotify = userWalletsArray.filter(
      (w) => !notifiedWallets.has(w.toLowerCase())
    );

    if (walletsToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All users who favorited this app have already received a notification from you for this app.",
        sentCount: 0,
      });
    }

    // Create notifications for all users who favorited
    // Convert relative paths to absolute URLs if needed
    let notificationLink = validated.link || `/apps/${appId}`;
    if (notificationLink && !notificationLink.startsWith('http://') && !notificationLink.startsWith('https://')) {
      // If it's a relative path, keep it as is (it will be resolved on the frontend)
      // Or convert to absolute URL if you have a base URL
      notificationLink = notificationLink.startsWith('/') ? notificationLink : `/${notificationLink}`;
    }
    
    const notifications = walletsToNotify.map((userWallet) => ({
      wallet: userWallet,
      type: "app_updated" as const,
      title: validated.title,
      message: validated.message,
      link: notificationLink,
      read: false,
    }));

    // Insert notifications one by one (Drizzle doesn't have createMany)
    await Promise.all(
      notifications.map(notif => db.insert(Notification).values(notif))
    );

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${notifications.length} user(s) who favorited your app.`,
      sentCount: notifications.length,
      skippedCount: notifiedWallets.size,
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

