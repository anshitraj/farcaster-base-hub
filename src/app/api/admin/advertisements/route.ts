import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator, requireAdminOnly } from "@/lib/admin";
import { getSessionFromCookies } from "@/lib/auth";
import { Advertisement } from "@/db/schema";
import { eq, and, asc, desc, SQL } from "drizzle-orm";
import { z } from "zod";

// Schema for creating/updating advertisements
const advertisementSchema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  linkUrl: z.string().url("Link URL must be a valid URL").optional().or(z.literal("")),
  position: z.string().default("sidebar"),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

// GET - Fetch all advertisements

export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position");
    const activeOnly = searchParams.get("activeOnly") === "true";

    const conditions: SQL[] = [];
    if (position) {
      conditions.push(eq(Advertisement.position, position));
    }
    if (activeOnly) {
      conditions.push(eq(Advertisement.isActive, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const advertisements = await db.select()
      .from(Advertisement)
      .where(whereClause)
      .orderBy(asc(Advertisement.order), desc(Advertisement.createdAt));

    return NextResponse.json({ advertisements });
  } catch (error: any) {
    if (error.message === "Moderator access required") {
      return NextResponse.json(
        { error: "Moderator access required" },
        { status: 403 }
      );
    }
    console.error("Error fetching advertisements:", error);
    return NextResponse.json(
      { error: "Failed to fetch advertisements", message: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new advertisement
export async function POST(request: NextRequest) {
  try {
    await requireAdminOnly();

    const body = await request.json();
    const validated = advertisementSchema.parse(body);

    // Get admin wallet from session
    const session = await getSessionFromCookies();
    const wallet = session?.wallet || null;

    const [advertisement] = await db.insert(Advertisement).values({
      ...validated,
      linkUrl: validated.linkUrl || null,
      createdBy: wallet,
    }).returning();

    return NextResponse.json({ advertisement }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Admin-only operation. Moderators cannot perform this action.") {
      return NextResponse.json(
        { error: "Only admins can create advertisements" },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating advertisement:", error);
    return NextResponse.json(
      { error: "Failed to create advertisement", message: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update an advertisement
export async function PATCH(request: NextRequest) {
  try {
    await requireAdminOnly();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Advertisement ID is required" }, { status: 400 });
    }

    const validated = advertisementSchema.partial().parse(updateData);

    const [advertisement] = await db.update(Advertisement)
      .set({
        ...validated,
        linkUrl: validated.linkUrl === "" ? null : validated.linkUrl,
      })
      .where(eq(Advertisement.id, id))
      .returning();

    return NextResponse.json({ advertisement });
  } catch (error: any) {
    if (error.message === "Admin-only operation. Moderators cannot perform this action.") {
      return NextResponse.json(
        { error: "Only admins can update advertisements" },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating advertisement:", error);
    return NextResponse.json(
      { error: "Failed to update advertisement", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete an advertisement
export async function DELETE(request: NextRequest) {
  try {
    await requireAdminOnly();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Advertisement ID is required" }, { status: 400 });
    }

    await db.delete(Advertisement).where(eq(Advertisement.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Admin-only operation. Moderators cannot perform this action.") {
      return NextResponse.json(
        { error: "Only admins can delete advertisements" },
        { status: 403 }
      );
    }
    console.error("Error deleting advertisement:", error);
    return NextResponse.json(
      { error: "Failed to delete advertisement", message: error.message },
      { status: 500 }
    );
  }
}

