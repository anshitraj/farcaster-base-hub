import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const addItemSchema = z.object({
  miniAppId: z.string().uuid(),
  collectionType: z.enum(["favorites", "custom", "airdrops", "games", "utilities", "beta"]).default("favorites"),
});

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
      return NextResponse.json({ error: "Unauthorized. Please connect your wallet." }, { status: 401 });
    }

    const body = await request.json();
    const validated = addItemSchema.parse(body);

    // Verify app exists
    const app = await prisma.miniApp.findUnique({
      where: { id: validated.miniAppId },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Get or create developer
    let developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      try {
        // Create developer if doesn't exist
        developer = await prisma.developer.create({
          data: {
            wallet: wallet.toLowerCase(),
          },
        });
      } catch (error: any) {
        // Handle unique constraint violation (race condition)
        if (error.code === 'P2002') {
          developer = await prisma.developer.findUnique({
            where: { wallet: wallet.toLowerCase() },
          });
        } else {
          throw error;
        }
      }
    }

    if (!developer) {
      return NextResponse.json(
        { error: "Failed to create or find developer profile" },
        { status: 500 }
      );
    }

    // Get or create favorites collection
    let collection;
    try {
      collection = await prisma.collection.findFirst({
        where: {
          developerId: developer.id,
          type: validated.collectionType,
        },
      });
    } catch (error: any) {
      // Handle database connection errors
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        console.warn("Database connection error in /api/collections/items POST (findFirst collection)");
        return NextResponse.json(
          { error: "Database unavailable. Please try again later." },
          { status: 503 }
        );
      }
      // Check if prisma.collection is undefined (Prisma client not generated)
      if (error.message?.includes("Cannot read properties of undefined") || !prisma.collection) {
        console.error("Prisma client not properly initialized. Collection model not found.");
        return NextResponse.json(
          { error: "Server configuration error. Please contact support." },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!collection) {
      try {
        collection = await prisma.collection.create({
          data: {
            developerId: developer.id,
            type: validated.collectionType,
            name: validated.collectionType === "favorites" ? "Favorites" : validated.collectionType,
            isPublic: true,
          },
        });
      } catch (error: any) {
        // Handle race condition where collection was created between findFirst and create
        if (error.code === 'P2002') {
          collection = await prisma.collection.findFirst({
            where: {
              developerId: developer.id,
              type: validated.collectionType,
            },
          });
        } else {
          throw error;
        }
      }
    }

    if (!collection) {
      return NextResponse.json(
        { error: "Failed to create or find collection" },
        { status: 500 }
      );
    }

    // Check if item already exists
    let existingItem;
    try {
      existingItem = await prisma.collectionItem.findFirst({
        where: {
          collectionId: collection.id,
          appId: validated.miniAppId,
        },
      });
    } catch (error: any) {
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        console.warn("Database connection error in /api/collections/items POST (findFirst item)");
        return NextResponse.json(
          { error: "Database unavailable. Please try again later." },
          { status: 503 }
        );
      }
      throw error;
    }

    if (existingItem) {
      return NextResponse.json(
        { error: "Item already in collection", item: existingItem },
        { status: 200 } // Return 200 since it's already favorited
      );
    }

    // Add item to collection
    try {
      const item = await prisma.collectionItem.create({
        data: {
          collectionId: collection.id,
          appId: validated.miniAppId,
        },
        include: {
          miniApp: {
            select: {
              id: true,
              name: true,
              iconUrl: true,
              category: true,
              description: true,
            },
          },
        },
      });

      return NextResponse.json({ item }, { status: 201 });
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === 'P2002') {
        try {
          const existingItem = await prisma.collectionItem.findFirst({
            where: {
              collectionId: collection.id,
              appId: validated.miniAppId,
            },
          });
          if (existingItem) {
            return NextResponse.json({ item: existingItem }, { status: 200 });
          }
        } catch (findError: any) {
          // If findFirst also fails, just return success since item likely exists
          if (findError.code === 'P1001' || findError.message?.includes("Can't reach database")) {
            return NextResponse.json(
              { error: "Database unavailable. Please try again later." },
              { status: 503 }
            );
          }
        }
      }
      // Handle database connection errors
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        console.warn("Database connection error in /api/collections/items POST (create item)");
        return NextResponse.json(
          { error: "Database unavailable. Please try again later." },
          { status: 503 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    
    // Handle database connection errors
    if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
      console.warn("Database connection error in /api/collections/items POST");
      return NextResponse.json(
        { error: "Database unavailable. Please try again later." },
        { status: 503 }
      );
    }
    
    console.error("Error adding item to collection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add item to collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const miniAppId = searchParams.get("miniAppId");
    const collectionType = searchParams.get("type") || "favorites";

    if (!miniAppId) {
      return NextResponse.json(
        { error: "miniAppId is required" },
        { status: 400 }
      );
    }

    let developer;
    try {
      developer = await prisma.developer.findUnique({
        where: { wallet: wallet.toLowerCase() },
      });
    } catch (error: any) {
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        console.warn("Database connection error in /api/collections/items DELETE");
        return NextResponse.json(
          { error: "Database unavailable. Please try again later." },
          { status: 503 }
        );
      }
      throw error;
    }

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    // Find the collection
    let collection;
    try {
      collection = await prisma.collection.findFirst({
        where: {
          developerId: developer.id,
          type: collectionType as any,
        },
      });
    } catch (error: any) {
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        console.warn("Database connection error in /api/collections/items DELETE (findFirst collection)");
        return NextResponse.json(
          { error: "Database unavailable. Please try again later." },
          { status: 503 }
        );
      }
      // Check if prisma.collection is undefined
      if (error.message?.includes("Cannot read properties of undefined") || !prisma.collection) {
        console.error("Prisma client not properly initialized. Collection model not found.");
        return NextResponse.json(
          { error: "Server configuration error. Please contact support." },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Find and delete the item
    const item = await prisma.collectionItem.findFirst({
      where: {
        collectionId: collection.id,
        appId: miniAppId,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in collection" },
        { status: 404 }
      );
    }

    await prisma.collectionItem.delete({
      where: { id: item.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing item from collection:", error);
    return NextResponse.json(
      { error: "Failed to remove item from collection" },
      { status: 500 }
    );
  }
}

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

    const searchParams = request.nextUrl.searchParams;
    const miniAppId = searchParams.get("miniAppId");
    const collectionType = searchParams.get("type") || "favorites";

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      return NextResponse.json({ isFavorited: false });
    }

    // Find the collection
    let collection;
    try {
      collection = await prisma.collection.findFirst({
        where: {
          developerId: developer.id,
          type: collectionType as any,
        },
      });
    } catch (error: any) {
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        console.warn("Database connection error in /api/collections/items GET");
        return NextResponse.json({ isFavorited: false });
      }
      // If collection model doesn't exist, return false
      if (error.message?.includes("Cannot read properties of undefined")) {
        console.error("Prisma client not properly initialized. Collection model not found.");
        return NextResponse.json({ isFavorited: false });
      }
      throw error;
    }

    if (!collection || !miniAppId) {
      return NextResponse.json({ isFavorited: false });
    }

    // Check if item exists in collection
    let item;
    try {
      item = await prisma.collectionItem.findFirst({
        where: {
          collectionId: collection.id,
          appId: miniAppId,
        },
      });
    } catch (error: any) {
      if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
        return NextResponse.json({ isFavorited: false });
      }
      throw error;
    }

    return NextResponse.json({ isFavorited: !!item });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json({ isFavorited: false });
  }
}

