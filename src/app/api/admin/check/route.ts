import { NextRequest, NextResponse } from "next/server";
import { getAdminRole, isAdmin, isModerator, isAdminOrModerator } from "@/lib/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const role = await getAdminRole();
    const admin = await isAdmin();
    const moderator = await isModerator();
    const hasAccess = await isAdminOrModerator();
    
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

