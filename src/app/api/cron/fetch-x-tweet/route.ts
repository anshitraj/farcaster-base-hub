import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { XTweet } from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";

const CRON_SECRET = process.env.CRON_SECRET || "your-secret-token";
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// Query terms to search (randomize between calls)
const QUERY_TERMS = [
  "Base chain",
  "BuildOnBase",
  "Base ecosystem",
  "Coinbase Base",
  "Base crypto",
];

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  attachments?: {
    media_keys?: string[];
  };
}

interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterResponse {
  data?: TwitterTweet[];
  includes?: {
    media?: TwitterMedia[];
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
  };
}

async function fetchRandomTweet(): Promise<{
  tweet: TwitterTweet | null;
  user: TwitterUser | null;
  media: TwitterMedia | null;
}> {
  if (!TWITTER_BEARER_TOKEN) {
    console.warn("TWITTER_BEARER_TOKEN not set, skipping Twitter fetch");
    return { tweet: null, user: null, media: null };
  }

  try {
    // Pick a random query term
    const query = QUERY_TERMS[Math.floor(Math.random() * QUERY_TERMS.length)];
    
    // Twitter API v2 search endpoint
    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", "10"); // Fetch 10, pick one random
    url.searchParams.set("tweet.fields", "created_at,author_id,attachments");
    url.searchParams.set("expansions", "author_id,attachments.media_keys");
    url.searchParams.set("media.fields", "type,url,preview_image_url");
    url.searchParams.set("user.fields", "name,username,profile_image_url");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 }, // Don't cache
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Twitter API error: ${response.status} - ${errorText}`);
      return { tweet: null, user: null, media: null };
    }

    const data: TwitterResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.log("No tweets found for query:", query);
      return { tweet: null, user: null, media: null };
    }

    // Pick a random tweet from results
    const randomTweet = data.data[Math.floor(Math.random() * data.data.length)];
    
    // Find user
    const user = data.includes?.users?.find((u) => u.id === randomTweet.author_id) || null;
    
    // Find media (first photo if available)
    let media: TwitterMedia | null = null;
    if (randomTweet.attachments?.media_keys && data.includes?.media) {
      const mediaKeys = randomTweet.attachments.media_keys;
      for (const key of mediaKeys) {
        const foundMedia = data.includes.media.find((m) => m.media_key === key && m.type === "photo");
        if (foundMedia) {
          media = foundMedia;
          break;
        }
      }
    }

    return { tweet: randomTweet, user: user || null, media };
  } catch (error: any) {
    console.error("Error fetching from Twitter API:", error);
    return { tweet: null, user: null, media: null };
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

    // Fetch one random tweet
    const { tweet, user, media } = await fetchRandomTweet();

    if (!tweet || !user) {
      return NextResponse.json({
        success: true,
        message: "No tweet found or Twitter API unavailable",
        fetched: false,
      });
    }

    // Check if tweet already exists (by tweetId)
    const existingTweet = await db
      .select()
      .from(XTweet)
      .where(eq(XTweet.tweetId, tweet.id))
      .limit(1);

    if (existingTweet.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Tweet already exists, skipping",
        fetched: false,
      });
    }

    // Limit content to 220 chars
    const content = tweet.text.length > 220 
      ? tweet.text.substring(0, 220) + "..."
      : tweet.text;

    // Store the tweet
    await db.insert(XTweet).values({
      tweetId: tweet.id,
      content,
      authorName: user.name,
      authorHandle: `@${user.username}`,
      authorAvatar: user.profile_image_url || null,
      mediaUrl: media?.url || media?.preview_image_url || null,
      createdAt: new Date(tweet.created_at),
    });

    // Clean up old tweets - keep only last 10
    const totalTweets = await db.select({ count: count() }).from(XTweet);
    if (totalTweets[0].count > 10) {
      // Get all tweets sorted by createdAt descending
      const allTweets = await db
        .select({ id: XTweet.id })
        .from(XTweet)
        .orderBy(desc(XTweet.createdAt));

      // Keep the top 10, delete the rest
      const tweetsToDelete = allTweets.slice(10);

      if (tweetsToDelete.length > 0) {
        const idsToDelete = tweetsToDelete.map((t) => t.id);
        // Delete in batches
        for (const id of idsToDelete) {
          await db.delete(XTweet).where(eq(XTweet.id, id));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tweet fetched and stored successfully",
      fetched: true,
      tweet: {
        id: tweet.id,
        author: user.username,
        content: content.substring(0, 50) + "...",
      },
    });
  } catch (error: any) {
    console.error("Twitter fetch cron error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Twitter posts", details: error.message },
      { status: 500 }
    );
  }
}

