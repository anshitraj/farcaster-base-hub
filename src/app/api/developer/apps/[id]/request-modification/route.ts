import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { MiniApp, Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
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
        { error: "Unauthorized. You can only request modifications for your own apps." },
        { status: 403 }
      );
    }

    // Update app status to pending_review and add modification request to notesToAdmin
    const existingNotes = app.notesToAdmin || "";
    const modificationRequest = `\n\n[MODIFICATION REQUEST - ${new Date().toISOString()}]\nMessage: ${validated.message}${validated.changes ? `\nChanges: ${validated.changes}` : ""}`;
    
    await db.update(MiniApp)
      .set({
        status: "pending_review",
        notesToAdmin: existingNotes + modificationRequest,
        updatedAt: new Date(),
      })
      .where(eq(MiniApp.id, appId));

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
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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

