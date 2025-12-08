import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const monetizationSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Toggle monetization for an app
 * Only the app owner can enable/disable monetization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = monetizationSchema.parse(body);

    const walletLower = wallet.toLowerCase();
    // Find the app and verify ownership
    const appResult = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, params.id))
      .limit(1);
    const appData = appResult[0];
    
    if (!appData) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    // Verify the user owns this app
    if (!app.developer || app.developer.wallet.toLowerCase() !== walletLower) {
      return NextResponse.json(
        { error: "Unauthorized: You can only modify your own apps" },
        { status: 403 }
      );
    }

    // Update monetization status
    const [updatedApp] = await db.update(MiniApp)
      .set({
        monetizationEnabled: validated.enabled,
      })
      .where(eq(MiniApp.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      app: {
        id: updatedApp.id,
        monetizationEnabled: updatedApp.monetizationEnabled,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Toggle monetization error:", error);
    return NextResponse.json(
      { error: "Failed to update monetization status" },
      { status: 500 }
    );
  }
}

