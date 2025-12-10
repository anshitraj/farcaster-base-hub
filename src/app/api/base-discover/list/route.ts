import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BaseDiscoverPost } from "@/db/schema";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// GET - List all Base Discover posts (public endpoint)
export async function GET(request: NextRequest) {
  try {
    console.log("Fetching Base Discover posts...");
    const posts = await db
      .select()
      .from(BaseDiscoverPost)
      .orderBy(desc(BaseDiscoverPost.createdAt))
      .limit(50); // Limit to 50 most recent posts

    console.log(`Found ${posts.length} Base Discover posts`);
    
    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        imageUrl: post.imageUrl,
        redirectUrl: post.redirectUrl,
        createdAt: post.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching Base Discover posts:", error);
    // Return empty array instead of error so UI doesn't break
    return NextResponse.json({
      posts: [],
      error: error.message,
    });
  }
}

