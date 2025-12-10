import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { XTweet } from "@/db/schema";
import { desc, sql, not, like } from "drizzle-orm";

export const runtime = "edge";
export const dynamic = 'force-dynamic'; // No caching - always fetch fresh data

export async function GET(request: NextRequest) {
  try {
    // Exclude admin posts (they have tweetId starting with "admin-")
    const tweets = await db
      .select()
      .from(XTweet)
      .where(not(like(XTweet.tweetId, 'admin-%')))
      .orderBy(desc(XTweet.createdAt))
      .limit(10);
    
    console.log(`[FEED] Fetched ${tweets.length} tweets (excluding admin posts)`);

    const response = NextResponse.json({
      tweets: tweets.map((tweet) => ({
        id: tweet.id,
        tweetId: tweet.tweetId,
        authorName: tweet.authorName,
        authorHandle: tweet.authorHandle,
        authorAvatar: tweet.authorAvatar,
        content: tweet.content,
        mediaUrl: tweet.mediaUrl,
        createdAt: tweet.createdAt.toISOString(),
      })),
    });
    
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    console.error("Error fetching X feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch X feed", details: error.message },
      { status: 500 }
    );
  }
}

