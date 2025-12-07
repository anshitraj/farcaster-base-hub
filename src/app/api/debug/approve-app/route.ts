import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";

// Quick debug endpoint to approve an app by ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 }
      );
    }

    // Update app to approved status
    const [app] = await db.update(MiniApp)
      .set({ status: "approved" })
      .where(eq(MiniApp.id, appId))
      .returning({
        id: MiniApp.id,
        name: MiniApp.name,
        status: MiniApp.status,
        featuredInBanner: MiniApp.featuredInBanner,
      });

    return NextResponse.json({
      success: true,
      message: `App "${app.name}" has been approved!`,
      app,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to approve app",
        details: error.code,
      },
      { status: 500 }
    );
  }
}

