import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SocialPost } from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";
import { getNeynarHeaders } from "@/config/neynar";

const CRON_SECRET = process.env.CRON_SECRET || "your-secret-token";
const BASE_CHANNEL_ID = "base"; // Base channel ID on Farcaster

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

interface NeynarCast {
  hash: string;
  author: {
    username: string;
    display_name: string;
    pfp_url?: string;
  };
  text: string;
  embeds?: Array<{
    url?: string;
    cast_id?: {
      hash: string;
    };
  }>;
  timestamp: string;
}

interface NeynarResponse {
  result?: {
    messages?: NeynarCast[];
  };
  messages?: NeynarCast[];
}

async function fetchBaseChannelCasts(): Promise<NeynarCast[]> {
  try {
    const headers = getNeynarHeaders();
    
    const url = new URL("https://api.neynar.com/v2/farcaster/channel/messages");
    url.searchParams.set("channel_id", BASE_CHANNEL_ID);
    url.searchParams.set("limit", "20"); // Fetch up to 20 casts

    const response = await fetch(url.toString(), {
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // Don't cache
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Neynar API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: NeynarResponse = await response.json();
    
    // Handle different response structures
    const casts = data.result?.messages || data.messages || [];
    return casts;
  } catch (error: any) {
    console.error("Error fetching from Neynar API:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret (for Vercel Cron)
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch casts from Base channel
    const casts = await fetchBaseChannelCasts();

    if (casts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No casts found or Neynar API unavailable",
        fetched: 0,
      });
    }

    let newCastsCount = 0;
    let skippedCount = 0;

    // Process each cast
    for (const cast of casts) {
      // Check if cast already exists (by castId/hash)
      if (cast.hash) {
        const existingCast = await db
          .select()
          .from(SocialPost)
          .where(eq(SocialPost.castId, cast.hash))
          .limit(1);

        if (existingCast.length > 0) {
          skippedCount++;
          continue;
        }
      }

      // Extract media URL from embeds
      let mediaUrl: string | null = null;
      if (cast.embeds && cast.embeds.length > 0) {
        const imageEmbed = cast.embeds.find((e) => e.url && !e.cast_id);
        if (imageEmbed?.url) {
          mediaUrl = imageEmbed.url;
        }
      }

      // Limit content to 220 chars
      const content = cast.text.length > 220 
        ? cast.text.substring(0, 220) + "..."
        : cast.text;

      // Store the cast
      await db.insert(SocialPost).values({
        castId: cast.hash,
        content,
        authorName: cast.author.display_name,
        authorHandle: `@${cast.author.username}`,
        authorAvatar: cast.author.pfp_url || null,
        mediaUrl,
        createdAt: new Date(cast.timestamp),
      });

      newCastsCount++;
    }

    // Clean up old posts - keep only last 20
    const totalPosts = await db.select({ count: count() }).from(SocialPost);
    if (totalPosts[0].count > 20) {
      // Get all posts sorted by createdAt descending
      const allPosts = await db
        .select({ id: SocialPost.id })
        .from(SocialPost)
        .orderBy(desc(SocialPost.createdAt));

      // Keep the top 20, delete the rest
      const postsToDelete = allPosts.slice(20);

      if (postsToDelete.length > 0) {
        const idsToDelete = postsToDelete.map((p) => p.id);
        // Delete in batches
        for (const id of idsToDelete) {
          await db.delete(SocialPost).where(eq(SocialPost.id, id));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Casts fetched and stored successfully",
      fetched: newCastsCount,
      skipped: skippedCount,
      total: casts.length,
    });
  } catch (error: any) {
    console.error("Farcaster fetch cron error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Farcaster casts", details: error.message },
      { status: 500 }
    );
  }
}

