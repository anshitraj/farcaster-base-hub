import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { BaseDiscoverPost } from "@/db/schema";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const createPostSchema = z.object({
  imageUrl: z.string().refine(
    (val) => {
      // Allow either a valid URL or a base64 data URL
      if (val.startsWith("data:image/")) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Image URL must be a valid URL or base64 data URL" }
  ),
  redirectUrl: z.string().url("Redirect URL must be a valid URL"),
});

// POST - Create a new Base Discover post
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

    // If imageUrl is a data URL or file, upload it to Vercel Blob
    let finalImageUrl = validated.imageUrl;
    
    if (validated.imageUrl.startsWith("data:image/")) {
      // Handle base64 image upload
      try {
        const base64Data = validated.imageUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const contentType = validated.imageUrl.match(/data:image\/(\w+);/)?.[1] || "png";
        
        const filename = `base-discover-${Date.now()}.${contentType}`;
        const blobPath = `base-discover/${filename}`;
        
        const blob = await put(blobPath, buffer, {
          access: "public",
          contentType: `image/${contentType}`,
        });
        
        finalImageUrl = blob.url;
      } catch (error: any) {
        console.error("Error uploading image to blob:", error);
        return NextResponse.json(
          { error: "Failed to upload image", details: error.message },
          { status: 500 }
        );
      }
    }

    console.log("Creating Base Discover post with:", {
      imageUrl: finalImageUrl.substring(0, 50) + "...",
      redirectUrl: validated.redirectUrl,
    });

    const newPost = await db
      .insert(BaseDiscoverPost)
      .values({
        imageUrl: finalImageUrl,
        redirectUrl: validated.redirectUrl,
      })
      .returning();

    console.log("Successfully created post:", newPost[0].id);

    return NextResponse.json({
      success: true,
      post: {
        id: newPost[0].id,
        imageUrl: newPost[0].imageUrl,
        redirectUrl: newPost[0].redirectUrl,
        createdAt: newPost[0].createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error creating Base Discover post:", error);
    console.error("Error stack:", error.stack);
    
    // Check if it's a database table error
    if (error.message?.includes("does not exist") || error.message?.includes("BaseDiscoverPost")) {
      return NextResponse.json(
        { 
          error: "Database table not found", 
          details: "Please run 'npm run drizzle:push' to create the BaseDiscoverPost table",
          hint: "The database migration needs to be run first"
        },
        { status: 500 }
      );
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create Base Discover post", details: error.message },
      { status: 500 }
    );
  }
}

