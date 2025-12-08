import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Promo } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { z } from "zod";
import { requireAdminOrLevel5 } from "@/lib/admin";

export const runtime = "edge";
export const dynamic = 'force-dynamic';

// Constants for promo duration limits
const MIN_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const WEEKLY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 hours per week

/**
 * Calculate weekly promo usage for the current week
 * Week starts on Monday at 00:00:00
 */
async function getWeeklyPromoUsage(excludePromoId?: string): Promise<number> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Get all promos created this week
  const allPromos = await db.select({
    id: Promo.id,
    startDate: Promo.startDate,
    endDate: Promo.endDate,
  })
    .from(Promo)
    .where(gte(Promo.createdAt, weekStart));

  // Calculate total duration in milliseconds
  let totalDuration = 0;
  for (const promo of allPromos) {
    // Skip the promo being edited if provided
    if (excludePromoId && promo.id === excludePromoId) {
      continue;
    }

    if (promo.startDate && promo.endDate) {
      const duration = new Date(promo.endDate).getTime() - new Date(promo.startDate).getTime();
      if (duration > 0) {
        totalDuration += duration;
      }
    }
  }

  return totalDuration;
}

/**
 * Validate promo duration
 */
function validatePromoDuration(startDate: Date, endDate: Date | null): { valid: boolean; error?: string; premiumRequired?: boolean } {
  if (!endDate) {
    return { valid: false, error: "End date is required" };
  }

  const duration = endDate.getTime() - startDate.getTime();

  if (duration < MIN_DURATION_MS) {
    return { valid: false, error: `Promo duration must be at least 30 minutes. Current duration: ${Math.round(duration / 60000)} minutes` };
  }

  if (duration > MAX_DURATION_MS) {
    return { valid: false, error: "Premium required", premiumRequired: true };
  }

  return { valid: true };
}

const updatePromoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  imageUrl: z.string().url().optional(),
  redirectUrl: z.string().url().optional(),
  appId: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  priority: z.number().int().optional(),
});

// GET /api/promos/[id] - Get specific promo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [promo] = await db.select()
      .from(Promo)
      .where(eq(Promo.id, params.id))
      .limit(1);

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ promo });
  } catch (error: any) {
    console.error("Error fetching promo:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo" },
      { status: 500 }
    );
  }
}

// PUT /api/promos/[id] - Update promo (admin/level 5 only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminOrLevel5();

    const body = await request.json();
    const validated = updatePromoSchema.parse(body);

    // Check if promo exists
    const [existing] = await db.select()
      .from(Promo)
      .where(eq(Promo.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    // Determine start and end dates (use existing if not provided in update)
    const startDate = validated.startDate ? new Date(validated.startDate) : new Date(existing.startDate);
    const endDate = validated.endDate !== undefined 
      ? (validated.endDate ? new Date(validated.endDate) : null)
      : (existing.endDate ? new Date(existing.endDate) : null);

    // If dates are being updated, validate duration
    if (validated.startDate !== undefined || validated.endDate !== undefined) {
      if (!endDate) {
        return NextResponse.json(
          { error: "End date is required" },
          { status: 400 }
        );
      }

      // Validate duration (30 minutes to 2 hours)
      const durationValidation = validatePromoDuration(startDate, endDate);
      if (!durationValidation.valid) {
        if (durationValidation.premiumRequired) {
          return NextResponse.json(
            { 
              error: "Promo duration exceeds 2 hours. Premium subscription required for longer durations.",
              premiumRequired: true,
              redirectTo: "/premium"
            },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: durationValidation.error },
          { status: 400 }
        );
      }

      // Check weekly usage limit (excluding this promo)
      const weeklyUsage = await getWeeklyPromoUsage(params.id);
      const newPromoDuration = endDate.getTime() - startDate.getTime();
      const totalUsage = weeklyUsage + newPromoDuration;

      if (totalUsage > WEEKLY_LIMIT_MS) {
        const remainingMs = WEEKLY_LIMIT_MS - weeklyUsage;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        
        return NextResponse.json(
          { 
            error: `Weekly limit exceeded. You have ${remainingHours}h ${remainingMinutes}m remaining this week. Premium subscription required for unlimited promo time.`,
            premiumRequired: true,
            redirectTo: "/premium",
            remainingTime: remainingMs
          },
          { status: 403 }
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl;
    if (validated.redirectUrl !== undefined) updateData.redirectUrl = validated.redirectUrl;
    if (validated.appId !== undefined) updateData.appId = validated.appId || null;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.startDate !== undefined) updateData.startDate = startDate;
    if (validated.endDate !== undefined) updateData.endDate = endDate;
    if (validated.priority !== undefined) updateData.priority = validated.priority;

    const [promo] = await db.update(Promo)
      .set(updateData)
      .where(eq(Promo.id, params.id))
      .returning();

    return NextResponse.json({ promo });
  } catch (error: any) {
    if (error.message?.includes("access required")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating promo:", error);
    return NextResponse.json(
      { error: "Failed to update promo" },
      { status: 500 }
    );
  }
}

// DELETE /api/promos/[id] - Delete promo (admin/level 5 only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminOrLevel5();

    const [promo] = await db.delete(Promo)
      .where(eq(Promo.id, params.id))
      .returning();

    if (!promo) {
      return NextResponse.json(
        { error: "Promo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Promo deleted successfully" });
  } catch (error: any) {
    if (error.message?.includes("access required")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    console.error("Error deleting promo:", error);
    return NextResponse.json(
      { error: "Failed to delete promo" },
      { status: 500 }
    );
  }
}

