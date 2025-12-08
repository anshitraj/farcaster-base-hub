import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

const DAILY_XP_REWARD = 10;
const WEEKLY_XP_REWARD = 50;
const XP_PER_LEVEL = 500; // XP needed per level

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      }
    }

    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const walletLower = wallet.toLowerCase();
    // Find or create developer
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    let developer = developerResult[0];

    if (!developer) {
      // Create developer if doesn't exist
      const [newDeveloper] = await db.insert(Developer).values({
        wallet: walletLower,
        streakCount: 0,
        totalXP: 0,
        developerLevel: 1,
      }).returning();
      developer = newDeveloper;
    }

    const now = new Date();
    const lastClaim = developer.lastClaimDate;
    
    // Check if claim is available (24h cooldown)
    if (lastClaim) {
      const timeSinceLastClaim = now.getTime() - lastClaim.getTime();
      const hoursSinceLastClaim = timeSinceLastClaim / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < 24) {
        const hoursRemaining = 24 - hoursSinceLastClaim;
        const minutesRemaining = Math.ceil((hoursRemaining % 1) * 60);
        const wholeHours = Math.floor(hoursRemaining);
        
        return NextResponse.json(
          {
            error: "Claim not available yet",
            hoursRemaining: wholeHours,
            minutesRemaining: minutesRemaining,
            canClaim: false,
          },
          { status: 400 }
        );
      }

      // Check if streak should reset (more than 48 hours since last claim)
      if (hoursSinceLastClaim >= 48) {
        // Reset streak
        developer.streakCount = 0;
      }
    }

    // Determine reward based on streak
    let reward = DAILY_XP_REWARD;
    let isWeeklyReward = false;
    let newStreakCount = developer.streakCount + 1;

    if (newStreakCount >= 7) {
      reward = WEEKLY_XP_REWARD;
      isWeeklyReward = true;
      newStreakCount = 0; // Reset streak after 7 days
    }

    // Update developer
    const newTotalXP = (developer.totalXP || 0) + reward;
    const newLevel = Math.floor(newTotalXP / XP_PER_LEVEL) + 1;

    const [updatedDeveloper] = await db.update(Developer)
      .set({
        streakCount: newStreakCount,
        lastClaimDate: now,
        totalXP: newTotalXP,
        developerLevel: newLevel,
      })
      .where(eq(Developer.wallet, walletLower))
      .returning();

    return NextResponse.json({
      success: true,
      reward,
      isWeeklyReward,
      streakCount: newStreakCount,
      totalXP: updatedDeveloper.totalXP,
      developerLevel: updatedDeveloper.developerLevel,
      nextClaimAvailable: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
  } catch (error: any) {
    console.error("XP claim error:", error);
    return NextResponse.json(
      { error: "Failed to claim XP", details: error.message },
      { status: 500 }
    );
  }
}


export const runtime = "edge";
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      }
    }

    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const walletLower = wallet.toLowerCase();
    const developerResult = await db.select({
      streakCount: Developer.streakCount,
      lastClaimDate: Developer.lastClaimDate,
      totalXP: Developer.totalXP,
      developerLevel: Developer.developerLevel,
    })
      .from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json({
        streakCount: 0,
        lastClaimDate: null,
        totalXP: 0,
        developerLevel: 1,
        canClaim: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
      });
    }

    const now = new Date();
    const lastClaim = developer.lastClaimDate;
    let canClaim = true;
    let hoursRemaining = 0;
    let minutesRemaining = 0;

    if (lastClaim) {
      const timeSinceLastClaim = now.getTime() - lastClaim.getTime();
      const hoursSinceLastClaim = timeSinceLastClaim / (1000 * 60 * 60);
      
      if (hoursSinceLastClaim < 24) {
        canClaim = false;
        const hoursRemainingCalc = 24 - hoursSinceLastClaim;
        minutesRemaining = Math.ceil((hoursRemainingCalc % 1) * 60);
        hoursRemaining = Math.floor(hoursRemainingCalc);
      } else if (hoursSinceLastClaim >= 48) {
        // Streak should reset
        canClaim = true;
      }
    }

    return NextResponse.json({
      streakCount: developer.streakCount,
      lastClaimDate: developer.lastClaimDate,
      totalXP: developer.totalXP,
      developerLevel: developer.developerLevel,
      canClaim,
      hoursRemaining,
      minutesRemaining,
    });
  } catch (error: any) {
    console.error("Get XP status error:", error);
    return NextResponse.json(
      { error: "Failed to get XP status" },
      { status: 500 }
    );
  }
}

