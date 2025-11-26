import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const app = await prisma.miniApp.findUnique({
      where: { id: params.id },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const metadata = {
      name: `Built ${app.name} on Base`,
      description: `Developer badge for building ${app.name} on Base`,
      image: app.iconUrl,
      attributes: [
        { trait_type: "App Name", value: app.name },
        { trait_type: "Developer", value: app.developer.wallet },
        { trait_type: "App URL", value: app.url },
        { trait_type: "Created", value: app.createdAt.toISOString() },
      ],
    };

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Get badge metadata error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

