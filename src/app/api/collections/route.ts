import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { Developer, Collection, CollectionItem, MiniApp } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

    const walletLower = wallet.toLowerCase();
    const developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json({ collections: [] });
    }

    const collectionsData = await db.select().from(Collection)
      .where(eq(Collection.developerId, developer.id))
      .orderBy(desc(Collection.createdAt));

    // Fetch items for each collection
    const collections = await Promise.all(
      collectionsData.map(async (collection) => {
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
          },
        })
          .from(CollectionItem)
          .leftJoin(MiniApp, eq(CollectionItem.appId, MiniApp.id))
          .where(eq(CollectionItem.collectionId, collection.id));

        return {
          ...collection,
          items: itemsData.map(d => ({
            id: d.item.id,
            addedAt: d.item.addedAt,
            miniApp: d.app,
          })),
        };
      })
    );

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

