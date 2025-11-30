import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST - Track advertisement click
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.advertisement.update({
      where: { id },
      data: {
        clickCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking click:", error);
    return NextResponse.json(
      { error: "Failed to track click", message: error.message },
      { status: 500 }
    );
  }
}

