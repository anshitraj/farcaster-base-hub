import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOnly } from "@/lib/admin";
import { z } from "zod";

const broadcastSchema = z.object({
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
  link: z.string().url().optional().or(z.literal("")),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminOnly(); // Broadcast notifications is admin-only

    const body = await request.json();
    const validated = broadcastSchema.parse(body);

    // Get all unique wallets from developers and user profiles
    const developers = await prisma.developer.findMany({
      select: { wallet: true },
    });

    const wallets = developers.map(d => d.wallet.toLowerCase());
    
    // Remove duplicates
    const uniqueWallets = [...new Set(wallets)];

    if (uniqueWallets.length === 0) {
      return NextResponse.json(
        { error: "No users found to send notifications to" },
        { status: 400 }
      );
    }

    // Create notifications for all users
    const notifications = uniqueWallets.map(wallet => ({
      wallet,
      type: validated.type,
      title: validated.title,
      message: validated.message,
      link: validated.link && validated.link.trim() ? validated.link : null,
      read: false,
    }));

    // Batch create notifications (Prisma supports createMany)
    await prisma.notification.createMany({
      data: notifications,
    });

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${uniqueWallets.length} users`,
      count: uniqueWallets.length,
    });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error broadcasting notification:", error);
    return NextResponse.json(
      { error: "Failed to broadcast notification" },
      { status: 500 }
    );
  }
}

