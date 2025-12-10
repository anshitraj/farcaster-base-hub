import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { Developer, Collection, CollectionItem, MiniApp } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["favorites", "custom", "airdrops", "games", "utilities", "beta"]).default("custom"),
  isPublic: z.boolean().default(true),
});


export const runtime = "nodejs"; // Use nodejs for better database performance
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    const session = await getSessionFromCookies();
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      wallet = cookieStore.get("walletAddress")?.value || null;
      
      // Also check for Farcaster session
      if (!wallet) {
        const farcasterFid = cookieStore.get("farcasterSession")?.value;
        if (farcasterFid) {
          wallet = `farcaster:${farcasterFid}`;
        }
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const walletLower = wallet.toLowerCase().trim();
    
    // Try to find developer with this wallet (supports both Ethereum and Farcaster formats)
    let developerResult;
    try {
      developerResult = await db.select().from(Developer)
        .where(eq(Developer.wallet, walletLower))
        .limit(1);
    } catch (error: any) {
      console.error("Error fetching developer:", error);
      // Return empty collections on error
      return NextResponse.json({ 
        collections: [{
          id: null,
          type: "favorites",
          name: "Favorites",
          items: [],
        }]
      });
    }
    
    let developer = developerResult[0];

    // If developer doesn't exist, create one (same as collections/items API does)
    if (!developer) {
      try {
        const [newDeveloper] = await db.insert(Developer).values({
          wallet: walletLower,
        }).returning();
        developer = newDeveloper;
      } catch (error: any) {
        // Handle race condition where developer was created between check and insert
        if (error?.message?.includes("unique") || error?.code === "23505") {
          try {
            developerResult = await db.select().from(Developer)
              .where(eq(Developer.wallet, walletLower))
              .limit(1);
            developer = developerResult[0];
          } catch (e) {
            console.error("Error fetching developer after race condition:", e);
          }
        } else {
          console.error("Error creating developer:", error);
        }
      }
    }

    if (!developer) {
      // Return empty collections array, but include an empty favorites collection
      // so the UI can show the empty state properly
      return NextResponse.json({ 
        collections: [{
          id: null,
          type: "favorites",
          name: "Favorites",
          items: [],
        }]
      });
    }

    // Fetch collections
    let collectionsData;
    try {
      collectionsData = await db.select().from(Collection)
        .where(eq(Collection.developerId, developer.id))
        .orderBy(desc(Collection.createdAt));
    } catch (error: any) {
      console.error("Error fetching collections:", error);
      // Return empty favorites collection on error
      return NextResponse.json({ 
        collections: [{
          id: null,
          type: "favorites",
          name: "Favorites",
          items: [],
        }]
      });
    }
    
    // Ensure favorites collection exists (create if it doesn't)
    let favoritesCollection = collectionsData.find(c => c.type === "favorites");
    if (!favoritesCollection) {
      // Create favorites collection if it doesn't exist
      try {
        const [newFavoritesCollection] = await db.insert(Collection).values({
          developerId: developer.id,
          type: "favorites",
          name: "Favorites",
          isPublic: true,
        }).returning();
        collectionsData.push(newFavoritesCollection);
        favoritesCollection = newFavoritesCollection; // Update reference
      } catch (error: any) {
        // If collection already exists (race condition), fetch it
        if (error?.message?.includes("unique") || error?.code === "23505") {
          const existingFavorites = await db.select().from(Collection)
            .where(and(
              eq(Collection.developerId, developer.id),
              eq(Collection.type, "favorites")
            ))
            .limit(1);
          if (existingFavorites[0] && !collectionsData.find(c => c.id === existingFavorites[0].id)) {
            collectionsData.push(existingFavorites[0]);
            favoritesCollection = existingFavorites[0]; // Update reference
          }
        } else {
          console.error("Error creating favorites collection:", error);
        }
      }
    }
    
    // If no collections exist at all, ensure we at least have an empty favorites collection
    if (collectionsData.length === 0) {
      try {
        const [newFavoritesCollection] = await db.insert(Collection).values({
          developerId: developer.id,
          type: "favorites",
          name: "Favorites",
          isPublic: true,
        }).returning();
        collectionsData = [newFavoritesCollection];
        favoritesCollection = newFavoritesCollection; // Update reference
      } catch (error: any) {
        console.error("Error creating initial favorites collection:", error);
      }
    }

    // Fetch items for each collection (optimized with single query for favorites)
    // For favorites collection, fetch items directly to avoid N+1 queries
    let favoritesItems: any[] = [];
    
    if (favoritesCollection) {
      try {
        const itemsData = await db.select({
          item: CollectionItem,
          app: {
            id: MiniApp.id,
            name: MiniApp.name,
            iconUrl: MiniApp.iconUrl,
            category: MiniApp.category,
            description: MiniApp.description,
            clicks: MiniApp.clicks,
            installs: MiniApp.installs,
            ratingAverage: MiniApp.ratingAverage,
            ratingCount: MiniApp.ratingCount,
            verified: MiniApp.verified,
            tags: MiniApp.tags,
          },
        })
          .from(CollectionItem)
          .leftJoin(MiniApp, eq(CollectionItem.appId, MiniApp.id))
          .where(eq(CollectionItem.collectionId, favoritesCollection.id))
          .orderBy(desc(CollectionItem.addedAt))
          .limit(100); // Limit to prevent huge queries

        favoritesItems = itemsData
          .filter(d => d.app && d.app.id !== null) // Filter out items where app was deleted
          .map(d => ({
            id: d.item.id,
            addedAt: d.item.addedAt,
            miniApp: d.app!,
          }));
      } catch (error) {
        console.error("Error fetching favorites items:", error);
        favoritesItems = [];
      }
    }

    // Fetch items for other collections (non-favorites)
    const otherCollections = await Promise.all(
      collectionsData
        .filter(c => c.type !== "favorites")
        .map(async (collection) => {
          try {
            const itemsData = await db.select({
              item: CollectionItem,
              app: {
                id: MiniApp.id,
                name: MiniApp.name,
                iconUrl: MiniApp.iconUrl,
                category: MiniApp.category,
                description: MiniApp.description,
                clicks: MiniApp.clicks,
                installs: MiniApp.installs,
                ratingAverage: MiniApp.ratingAverage,
                ratingCount: MiniApp.ratingCount,
                verified: MiniApp.verified,
                tags: MiniApp.tags,
              },
            })
              .from(CollectionItem)
              .leftJoin(MiniApp, eq(CollectionItem.appId, MiniApp.id))
              .where(eq(CollectionItem.collectionId, collection.id))
              .orderBy(desc(CollectionItem.addedAt))
              .limit(50); // Limit to prevent huge queries

            return {
              ...collection,
              items: itemsData
                .filter(d => d.app && d.app.id !== null)
                .map(d => ({
                  id: d.item.id,
                  addedAt: d.item.addedAt,
                  miniApp: d.app!,
                })),
            };
          } catch (error) {
            console.error(`Error fetching items for collection ${collection.id}:`, error);
            return {
              ...collection,
              items: [],
            };
          }
        })
    );

    // Combine favorites with other collections
    const collections = collectionsData.map(collection => {
      if (collection.type === "favorites") {
        return {
          ...collection,
          items: favoritesItems,
        };
      } else {
        const otherCollection = otherCollections.find(c => c.id === collection.id);
        return otherCollection || { ...collection, items: [] };
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`[API/collections] Fetched ${collections.length} collections in ${duration}ms for wallet ${walletLower.substring(0, 10)}...`);

    return NextResponse.json({ collections }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
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

    const walletLower = wallet.toLowerCase();
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

    const [collection] = await db.insert(Collection).values({
      name: validated.name,
      description: validated.description,
      type: validated.type,
      isPublic: validated.isPublic,
      developerId: developer.id,
    }).returning();
    
    // Fetch empty items array
    const items = await db.select().from(CollectionItem)
      .where(eq(CollectionItem.collectionId, collection.id));
    
    const collectionWithItems = {
      ...collection,
      items,
    };

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

