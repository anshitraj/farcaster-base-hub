import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Promo, MiniApp } from "@/db/schema";
import { eq, and, gte, lte, or, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdminOrLevel5, isAdminOrLevel5 } from "@/lib/admin";
import { getSessionFromCookies } from "@/lib/auth";

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

const createPromoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  imageUrl: z.string().url("Image URL must be a valid URL"),
  redirectUrl: z.string().url("Redirect URL must be a valid URL"),
  appId: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "inactive", "expired"]).default("active"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  priority: z.number().int().default(0),
});

// GET /api/promos - Get active promos (public)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const all = searchParams.get("all") === "true";

    // If "all" is requested, check permissions
    if (all) {
      const hasAccess = await isAdminOrLevel5();
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Unauthorized. Admin or level 5+ access required." },
          { status: 403 }
        );
      }

      // Return all promos for admin/level 5
      const promos = await db.select({
        id: Promo.id,
        title: Promo.title,
        imageUrl: Promo.imageUrl,
        redirectUrl: Promo.redirectUrl,
        appId: Promo.appId,
        status: Promo.status,
        startDate: Promo.startDate,
        endDate: Promo.endDate,
        clicks: Promo.clicks,
        priority: Promo.priority,
        createdAt: Promo.createdAt,
        updatedAt: Promo.updatedAt,
      })
        .from(Promo)
        .orderBy(desc(Promo.priority), desc(Promo.createdAt));

      return NextResponse.json({ promos });
    }

    // Public endpoint: return only active promos
    const now = new Date();
    const activePromos = await db.select({
      id: Promo.id,
      title: Promo.title,
      imageUrl: Promo.imageUrl,
      redirectUrl: Promo.redirectUrl,
      appId: Promo.appId,
      priority: Promo.priority,
    })
      .from(Promo)
      .where(
        and(
          eq(Promo.status, "active"),
          or(
            isNull(Promo.startDate),
            lte(Promo.startDate, now)
          ),
          or(
            isNull(Promo.endDate),
            gte(Promo.endDate, now)
          )
        )
      )
      .orderBy(desc(Promo.priority), desc(Promo.createdAt));

    return NextResponse.json({ promos: activePromos });
  } catch (error: any) {
    console.error("Error fetching promos:", error);
    return NextResponse.json(
      { error: "Failed to fetch promos" },
      { status: 500 }
    );
  }
}

// POST /api/promos - Create promo (admin/level 5 only)
export async function POST(request: NextRequest) {
  try {
    await requireAdminOrLevel5();

    const body = await request.json();
    const validated = createPromoSchema.parse(body);

    // Validate dates are provided
    if (!validated.startDate || !validated.endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

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

    // Check weekly usage limit
    const weeklyUsage = await getWeeklyPromoUsage();
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

    const [promo] = await db.insert(Promo).values({
      title: validated.title,
      imageUrl: validated.imageUrl,
      redirectUrl: validated.redirectUrl,
      appId: validated.appId || null,
      status: validated.status,
      startDate: startDate,
      endDate: endDate,
      priority: validated.priority,
      clicks: 0,
    }).returning();

    return NextResponse.json({ promo }, { status: 201 });
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
    console.error("Error creating promo:", error);
    return NextResponse.json(
      { error: "Failed to create promo" },
      { status: 500 }
    );
  }
}

