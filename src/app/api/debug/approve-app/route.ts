import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    const app = await prisma.miniApp.update({
      where: { id: appId },
      data: {
        status: "approved",
      },
      select: {
        id: true,
        name: true,
        status: true,
        featuredInBanner: true,
      },
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

