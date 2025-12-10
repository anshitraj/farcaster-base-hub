import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { BaseDiscoverPost } from "@/db/schema";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// DELETE - Delete a Base Discover post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
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

    const postId = params.id;

    // Check if post exists
    const post = await db
      .select()
      .from(BaseDiscoverPost)
      .where(eq(BaseDiscoverPost.id, postId))
      .limit(1);

    if (post.length === 0) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Delete the post
    await db
      .delete(BaseDiscoverPost)
      .where(eq(BaseDiscoverPost.id, postId));

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting Base Discover post:", error);
    return NextResponse.json(
      { error: "Failed to delete Base Discover post", details: error.message },
      { status: 500 }
    );
  }
}

