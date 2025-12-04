import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";

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
        { error: "Unauthorized. You can only delete your own apps." },
        { status: 403 }
      );
    }

    // Delete app (cascade will handle related records)
    await prisma.miniApp.delete({
      where: { id: appId },
    });

    return NextResponse.json({ success: true, message: "App deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting app:", error);
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
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

