import { NextRequest, NextResponse } from "next/server";

// Import the feature flags (in production, use database or env vars)
// For now, we'll fetch from the admin settings API
let premiumEnabled = true; // Default

export async function GET(request: NextRequest) {
  try {
    // In production, fetch from database or env var
    // For now, return the current state
    return NextResponse.json({
      premiumEnabled: premiumEnabled,
    });
  } catch (error) {
    console.error("Error fetching premium settings:", error);
    return NextResponse.json(
      { premiumEnabled: true }, // Default to enabled on error
      { status: 500 }
    );
  }
}

// This function is called by the admin settings API to update the flag
export function setPremiumEnabled(enabled: boolean) {
  premiumEnabled = enabled;
}

export function isPremiumEnabled(): boolean {
  return premiumEnabled;
}

