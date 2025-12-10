import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { SocialPost, XTweet } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(500, "Content must be less than 500 characters"),
  mediaUrl: z.string().url("Media URL must be a valid URL").optional().or(z.literal("")),
  authorName: z.string().optional(),
  authorHandle: z.string().optional(),
  authorAvatar: z.string().url("Avatar URL must be a valid URL").optional().or(z.literal("")),
});

// GET - List all social posts
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const { Developer } = await import("@/db/schema");
    const developer = await db
      .select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);

    if (!developer[0] || !developer[0].adminRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const posts = await db
      .select()
      .from(SocialPost)
      .orderBy(desc(SocialPost.createdAt))
      .limit(100);

    return NextResponse.json({
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
  } catch (error: any) {
    console.error("Error fetching social posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch social posts", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new admin post
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const { Developer } = await import("@/db/schema");
    const developer = await db
      .select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);

    if (!developer[0] || !developer[0].adminRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createPostSchema.parse(body);

    // Limit content to 220 chars for display
    const content = validated.content.length > 220 
      ? validated.content.substring(0, 220) + "..."
      : validated.content;

    const newPost = await db
      .insert(SocialPost)
      .values({
        castId: null, // Admin posts don't have a castId
        content,
        mediaUrl: validated.mediaUrl || null,
        authorName: validated.authorName || null,
        authorHandle: validated.authorHandle || null,
        authorAvatar: validated.authorAvatar || null,
      })
      .returning();

    // Admin posts only go to Internal Base Feed (SocialPost/Farcaster feed)
    // External Base Feed (XTweet) is only for actual Twitter tweets

    // Clean up old posts - keep only last 50
    // This is done in the cron job to avoid complexity here

    return NextResponse.json({
      success: true,
      post: {
        id: newPost[0].id,
        castId: newPost[0].castId,
        authorName: newPost[0].authorName,
        authorHandle: newPost[0].authorHandle,
        authorAvatar: newPost[0].authorAvatar,
        content: newPost[0].content,
        mediaUrl: newPost[0].mediaUrl,
        createdAt: newPost[0].createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error creating social post:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create social post", details: error.message },
      { status: 500 }
    );
  }
}

