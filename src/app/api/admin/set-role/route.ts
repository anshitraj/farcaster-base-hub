/**
 * Temporary API endpoint to set admin role for a wallet
 * This is a one-time migration helper - remove after migration is complete
 * 
 * Usage: POST /api/admin/set-role
 * Body: { wallet: "0x...", role: "ADMIN" | "MODERATOR" }
 * 
 * Note: This endpoint should be protected or removed after initial setup
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const setRoleSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  role: z.enum(["ADMIN", "MODERATOR"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = setRoleSchema.parse(body);

    const walletLower = validated.wallet.toLowerCase();
    // Find or create developer
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    let developer = developerResult[0];

    if (!developer) {
      // Create developer if they don't exist
      const [newDeveloper] = await db.insert(Developer).values({
        wallet: walletLower,
        adminRole: validated.role,
      }).returning();
      developer = newDeveloper;
    } else {
      // Update existing developer
      const [updatedDeveloper] = await db.update(Developer)
        .set({ adminRole: validated.role })
        .where(eq(Developer.id, developer.id))
        .returning();
      developer = updatedDeveloper;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully set ${validated.role} role for ${validated.wallet}`,
      developer: {
        wallet: developer.wallet,
        adminRole: developer.adminRole,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Set role error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set role" },
      { status: 500 }
    );
  }
}

