import { NextRequest, NextResponse } from "next/server";
import { getAdminRole, isAdmin, isModerator, isAdminOrModerator } from "@/lib/admin";
import { db } from "@/lib/db";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // Check if client provided wallet address (useful for Base App mobile)
    const { searchParams } = new URL(request.url);
    const clientWallet = searchParams.get("wallet");
    
    // If client provided wallet, we'll use it as additional check
    // The getAdminRole() function already handles Farcaster FID resolution
    // But we can also check the provided wallet directly if it's an Ethereum address
    const role = await getAdminRole();
    const admin = await isAdmin();
    const moderator = await isModerator();
    let hasAccess = await isAdminOrModerator();
    
    // If no access found and client provided an Ethereum wallet, check that too
    if (!hasAccess && clientWallet && /^0x[a-fA-F0-9]{40}$/.test(clientWallet)) {
      const normalizedClientWallet = clientWallet.toLowerCase().trim();
      const developerResult = await db.select({ adminRole: Developer.adminRole })
        .from(Developer)
        .where(eq(Developer.wallet, normalizedClientWallet))
        .limit(1);
      const developer = developerResult[0];
      
      if (developer?.adminRole === "ADMIN" || developer?.adminRole === "MODERATOR") {
        hasAccess = true;
      }
    }
    
    return NextResponse.json({ 
      role,
      isAdmin: admin,
      isModerator: moderator,
      hasAccess,
      message: hasAccess ? `${role} access granted` : "Access denied"
    });
  } catch (error: any) {
    console.error("Check admin error:", error);
    return NextResponse.json(
      { role: null, isAdmin: false, isModerator: false, hasAccess: false, error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}

