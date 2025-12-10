import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { SocialPost, XTweet } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// DELETE - Delete a social post
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

    // Check if post exists
    const post = await db
      .select()
      .from(SocialPost)
      .where(eq(SocialPost.id, params.id))
      .limit(1);

    if (!post[0]) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Only allow deleting admin posts (posts without castId are admin-created)
    if (post[0].castId) {
      return NextResponse.json(
        { error: "Cannot delete Farcaster casts" },
        { status: 403 }
      );
    }

    // Delete from SocialPost table
    const deleteResult = await db.delete(SocialPost).where(eq(SocialPost.id, params.id));
    
    console.log(`[DELETE] Deleted post ${params.id} from SocialPost table`);
    console.log(`[DELETE] Delete result:`, deleteResult);

    // Also check and delete from XTweet if it exists (for old admin posts that were dual-inserted)
    const adminTweetId = `admin-${params.id}`;
    const xTweetDeleteResult = await db.delete(XTweet).where(eq(XTweet.tweetId, adminTweetId));
    console.log(`[DELETE] Attempted to delete XTweet with tweetId: ${adminTweetId}`);
    console.log(`[DELETE] XTweet delete result:`, xTweetDeleteResult);

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
      deletedFrom: {
        socialPost: true,
        xTweet: true,
      },
    });
  } catch (error: any) {
    console.error("Error deleting social post:", error);
    return NextResponse.json(
      { error: "Failed to delete social post", details: error.message },
      { status: 500 }
    );
  }
}

