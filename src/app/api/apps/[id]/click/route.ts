import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

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

    const app = await prisma.miniApp.findUnique({
      where: { id: params.id },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Create event
    await prisma.appEvent.create({
      data: {
        miniAppId: app.id,
        type,
      },
    });

    // Update app stats
    const updateData: any = {};
    if (type === "click") {
      updateData.clicks = { increment: 1 };
    } else if (type === "install") {
      updateData.installs = { increment: 1 };
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.miniApp.update({
        where: { id: app.id },
        data: updateData,
      });
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

