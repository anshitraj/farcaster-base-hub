import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const admin = await isAdmin();
    
    return NextResponse.json({ 
      isAdmin: admin,
      message: admin ? "Admin access granted" : "Admin access denied"
    });
  } catch (error: any) {
    console.error("Check admin error:", error);
    return NextResponse.json(
      { isAdmin: false, error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}

