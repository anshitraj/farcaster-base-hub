import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { MiniApp, AppEvent } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const eventSchema = z.object({
  type: z.enum(["click", "open", "install"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { type } = eventSchema.parse(body);

    const appResult = await db.select().from(MiniApp).where(eq(MiniApp.id, params.id)).limit(1);
    const app = appResult[0];

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Create event
    await db.insert(AppEvent).values({
      miniAppId: app.id,
      type,
    });

    // Update app stats
    if (type === "click") {
      await db.update(MiniApp)
        .set({ clicks: app.clicks + 1 })
        .where(eq(MiniApp.id, app.id));
    } else if (type === "install") {
      await db.update(MiniApp)
        .set({ installs: app.installs + 1 })
        .where(eq(MiniApp.id, app.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    console.error("Log event error:", error);
    return NextResponse.json(
      { error: "Failed to log event" },
      { status: 500 }
    );
  }
}

