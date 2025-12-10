import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SocialPost } from "@/db/schema";
import { desc } from "drizzle-orm";

export const runtime = "edge";
export const dynamic = 'force-dynamic'; // No caching - always fetch fresh data

export async function GET(request: NextRequest) {
  try {
    const posts = await db
      .select()
      .from(SocialPost)
      .orderBy(desc(SocialPost.createdAt))
      .limit(20);

    const response = NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        castId: post.castId,
        authorName: post.authorName,
        authorHandle: post.authorHandle,
        authorAvatar: post.authorAvatar,
        content: post.content,
        mediaUrl: post.mediaUrl,
        createdAt: post.createdAt.toISOString(),
      })),
    });
    
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    console.error("Error fetching base social feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch base social feed", details: error.message },
      { status: 500 }
    );
  }
}

