import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["favorites", "custom", "airdrops", "games", "utilities", "beta"]).default("custom"),
  isPublic: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
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

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      return NextResponse.json({ collections: [] });
    }

    const collections = await prisma.collection.findMany({
      where: { developerId: developer.id },
      include: {
        items: {
          include: {
            miniApp: {
              select: {
                id: true,
                name: true,
                iconUrl: true,
                category: true,
                description: true,
                clicks: true,
                installs: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = createCollectionSchema.parse(body);

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    const collection = await prisma.collection.create({
      data: {
        name: validated.name,
        description: validated.description,
        type: validated.type,
        isPublic: validated.isPublic,
        developerId: developer.id,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}

