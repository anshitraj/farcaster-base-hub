import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const sendNotificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  message: z.string().min(1, "Message is required").max(500, "Message must be less than 500 characters"),
  link: z.string().url().optional(),
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

    // Verify app exists and belongs to developer
    const app = await prisma.miniApp.findUnique({
      where: { id: appId },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (app.developer.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized. You can only send notifications for your own apps." },
        { status: 403 }
      );
    }

    // Get all users who have favorited this app
    const favoriteCollections = await prisma.collectionItem.findMany({
      where: {
        appId: appId,
        collection: {
          type: "favorites",
        },
      },
      include: {
        collection: {
          include: {
            developer: true,
          },
        },
      },
    });

    // Get unique wallets (users who favorited)
    const userWallets = new Set<string>();
    favoriteCollections.forEach((item) => {
      if (item.collection.developer.wallet) {
        userWallets.add(item.collection.developer.wallet.toLowerCase());
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
    // Each developer can send only 1 notification to each user who favorited their app
    // Check if any of these users already received a notification for this specific app
    const existingNotifications = await prisma.notification.findMany({
      where: {
        wallet: { in: Array.from(userWallets) },
        type: "app_updated",
        link: { contains: `/apps/${appId}` },
      },
      select: {
        wallet: true,
      },
    });

    // Create a set of wallets that already received a notification for this app
    const notifiedWallets = new Set(existingNotifications.map(n => n.wallet.toLowerCase()));
    
    // Filter out users who already received a notification for this app
    // This ensures each developer can send only 1 notification per user per app
    const walletsToNotify = Array.from(userWallets).filter(
      (w) => !notifiedWallets.has(w.toLowerCase())
    );

    if (walletsToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All users who favorited this app have already received a notification from you for this app.",
        sentCount: 0,
      });
    }

    // Create notifications for all users who favorited (excluding those who got one in last 24h)
    const notifications = walletsToNotify.map((userWallet) => ({
      wallet: userWallet,
      type: "app_updated",
      title: validated.title,
      message: validated.message,
      link: validated.link || `/apps/${appId}`,
      read: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

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
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
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

