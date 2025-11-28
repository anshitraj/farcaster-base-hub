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
import { prisma } from "@/lib/db";
import { z } from "zod";

const setRoleSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  role: z.enum(["ADMIN", "MODERATOR"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = setRoleSchema.parse(body);

    // Find or create developer
    let developer = await prisma.developer.findUnique({
      where: { wallet: validated.wallet.toLowerCase() },
    });

    if (!developer) {
      // Create developer if they don't exist
      developer = await prisma.developer.create({
        data: {
          wallet: validated.wallet.toLowerCase(),
          adminRole: validated.role,
        },
      });
    } else {
      // Update existing developer
      developer = await prisma.developer.update({
        where: { id: developer.id },
        data: {
          adminRole: validated.role,
        },
      });
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

