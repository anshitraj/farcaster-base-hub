import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if admin
    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer || !developer.isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const appId = params.id;

    // Delete premium app
    await prisma.premiumApp.delete({
      where: { miniAppId: appId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete premium app error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

