import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { MiniApp, Developer, Collection, CollectionItem, Notification } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
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
    const walletLower = wallet.toLowerCase();

    // Verify app exists
    const appResult = await db.select().from(MiniApp)
      .where(eq(MiniApp.id, validated.miniAppId))
      .limit(1);
    const app = appResult[0];

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Get or create developer
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    let developer = developerResult[0];

    if (!developer) {
      try {
        const [newDeveloper] = await db.insert(Developer).values({
          wallet: walletLower,
        }).returning();
        developer = newDeveloper;
      } catch (error: any) {
        // Handle unique constraint violation (race condition)
        if (error?.message?.includes("unique") || error?.code === "23505") {
          developerResult = await db.select().from(Developer)
            .where(eq(Developer.wallet, walletLower))
            .limit(1);
          developer = developerResult[0];
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
    let collectionResult = await db.select().from(Collection)
      .where(and(
        eq(Collection.developerId, developer.id),
        eq(Collection.type, validated.collectionType)
      ))
      .limit(1);
    let collection = collectionResult[0];

    if (!collection) {
      try {
        const [newCollection] = await db.insert(Collection).values({
          developerId: developer.id,
          type: validated.collectionType,
          name: validated.collectionType === "favorites" ? "Favorites" : validated.collectionType,
          isPublic: true,
        }).returning();
        collection = newCollection;
      } catch (error: any) {
        // Handle race condition where collection was created between findFirst and create
        if (error?.message?.includes("unique") || error?.code === "23505") {
          collectionResult = await db.select().from(Collection)
            .where(and(
              eq(Collection.developerId, developer.id),
              eq(Collection.type, validated.collectionType)
            ))
            .limit(1);
          collection = collectionResult[0];
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
    const existingItemResult = await db.select().from(CollectionItem)
      .where(and(
        eq(CollectionItem.collectionId, collection.id),
        eq(CollectionItem.appId, validated.miniAppId)
      ))
      .limit(1);
    const existingItem = existingItemResult[0];

    if (existingItem) {
      return NextResponse.json(
        { error: "Item already in collection", item: existingItem },
        { status: 200 } // Return 200 since it's already favorited
      );
    }

    // Add item to collection
    try {
      const [item] = await db.insert(CollectionItem).values({
        collectionId: collection.id,
        appId: validated.miniAppId,
      }).returning();

      // Fetch app with developer for notification
      const appWithDevResult = await db.select({
        app: MiniApp,
        developer: Developer,
      })
        .from(MiniApp)
        .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
        .where(eq(MiniApp.id, validated.miniAppId))
        .limit(1);
      const appWithDev = appWithDevResult[0];

      // Send notification to developer when user favorites their app (only for favorites collection)
      // Rate limit: 1 notification per app per 24 hours
      if (validated.collectionType === "favorites" && appWithDev?.developer?.wallet) {
        try {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          // Check if developer already received a notification for this app in last 24 hours
          const recentNotificationResult = await db.select().from(Notification)
            .where(and(
              eq(Notification.wallet, appWithDev.developer.wallet.toLowerCase()),
              eq(Notification.type, "new_app"),
              gte(Notification.createdAt, twentyFourHoursAgo)
            ))
            .limit(1);
          const recentNotification = recentNotificationResult[0];

          // Only send if no recent notification exists
          if (!recentNotification) {
            await db.insert(Notification).values({
              wallet: appWithDev.developer.wallet.toLowerCase(),
              type: "new_app",
              title: "New Favorite! ⭐",
              message: `Someone added "${appWithDev.app.name}" to their favorites!`,
              link: `/apps/${validated.miniAppId}`,
              read: false,
            });
          }
        } catch (notifError) {
          // Don't fail the favorite operation if notification fails
          console.error("Error sending favorite notification:", notifError);
        }
      }

      return NextResponse.json({ item }, { status: 201 });
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error?.message?.includes("unique") || error?.code === "23505") {
        try {
          const existingItemResult = await db.select().from(CollectionItem)
            .where(and(
              eq(CollectionItem.collectionId, collection.id),
              eq(CollectionItem.appId, validated.miniAppId)
            ))
            .limit(1);
          const existingItem = existingItemResult[0];
          if (existingItem) {
            return NextResponse.json({ item: existingItem }, { status: 200 });
          }
        } catch (findError: any) {
          if (findError?.message?.includes("connection") || findError?.message?.includes("database")) {
            return NextResponse.json(
              { error: "Database unavailable. Please try again later." },
              { status: 503 }
            );
          }
        }
      }
      // Handle database connection errors
      if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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
    const walletLower = wallet.toLowerCase();

    if (!miniAppId) {
      return NextResponse.json(
        { error: "miniAppId is required" },
        { status: 400 }
      );
    }

    const developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    // Find the collection
    const collectionResult = await db.select().from(Collection)
      .where(and(
        eq(Collection.developerId, developer.id),
        eq(Collection.type, collectionType as any)
      ))
      .limit(1);
    const collection = collectionResult[0];

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Find and delete the item
    const itemResult = await db.select().from(CollectionItem)
      .where(and(
        eq(CollectionItem.collectionId, collection.id),
        eq(CollectionItem.appId, miniAppId)
      ))
      .limit(1);
    const item = itemResult[0];

    if (!item) {
      return NextResponse.json(
        { error: "Item not found in collection" },
        { status: 404 }
      );
    }

    await db.delete(CollectionItem).where(eq(CollectionItem.id, item.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing item from collection:", error);
    return NextResponse.json(
      { error: "Failed to remove item from collection" },
      { status: 500 }
    );
  }
}


export const runtime = "edge";
export const revalidate = 30; // Cache for 30 seconds

export async function GET(request: NextRequest) {
  try {
    // OPTIMIZE: Check cookie FIRST (no DB query for session)
    const cookieStore = await cookies();
    let wallet: string | null = cookieStore.get("walletAddress")?.value || null;
    
    // Only query DB for session if cookie doesn't exist
    if (!wallet) {
      const session = await getSessionFromCookies();
      wallet = session?.wallet || null;
    }

    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const miniAppId = searchParams.get("miniAppId");
    const collectionType = searchParams.get("type") || "favorites";
    const walletLower = wallet.toLowerCase();

    if (!miniAppId) {
      return NextResponse.json({ isFavorited: false });
    }

    // Optimize: Single query with joins instead of 3 sequential queries
    // Only select id field (smallest possible result)
    const result = await db
      .select({
        itemId: CollectionItem.id,
      })
      .from(CollectionItem)
      .innerJoin(Collection, eq(CollectionItem.collectionId, Collection.id))
      .innerJoin(Developer, eq(Collection.developerId, Developer.id))
      .where(and(
        eq(Developer.wallet, walletLower),
        eq(Collection.type, collectionType as any),
        eq(CollectionItem.appId, miniAppId)
      ))
      .limit(1);

    const isFavorited = result.length > 0;

    const response = NextResponse.json({ isFavorited });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json({ isFavorited: false });
  }
}
