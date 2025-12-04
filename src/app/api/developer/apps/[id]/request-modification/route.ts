import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const requestModificationSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
  changes: z.string().optional(), // Description of changes requested
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
    const validated = requestModificationSchema.parse(body);

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
        { error: "Unauthorized. You can only request modifications for your own apps." },
        { status: 403 }
      );
    }

    // Update app status to pending_review and add modification request to notesToAdmin
    const existingNotes = app.notesToAdmin || "";
    const modificationRequest = `\n\n[MODIFICATION REQUEST - ${new Date().toISOString()}]\nMessage: ${validated.message}${validated.changes ? `\nChanges: ${validated.changes}` : ""}`;
    
    await prisma.miniApp.update({
      where: { id: appId },
      data: {
        status: "pending_review",
        notesToAdmin: existingNotes + modificationRequest,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Modification request submitted successfully. Admin will review your request." 
    });
  } catch (error: any) {
    console.error("Error requesting modification:", error);
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
      { error: "Failed to submit modification request" },
      { status: 500 }
    );
  }
}

