import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserPoints, Developer, UserProfile } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateStreak } from "@/lib/quest-helpers";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Fetch all users with points, sorted by totalPoints descending
    const users = await db.select().from(UserPoints)
      .orderBy(desc(UserPoints.totalPoints))
      .limit(limit);

    // Fetch developer info for each user to get name, avatar, Base name, etc.
    const usersWithInfo = await Promise.all(
      users.map(async (user) => {
        // Calculate streak for this user
        const streak = await calculateStreak(user.wallet);
        
        const developerResult = await db.select({
          name: Developer.name,
          avatar: Developer.avatar,
          verified: Developer.verified,
          totalXP: Developer.totalXP,
          developerLevel: Developer.developerLevel,
        })
          .from(Developer)
          .where(eq(Developer.wallet, user.wallet))
          .limit(1);
        const developer = developerResult[0];

        // Try to get Base name from developer profile or UserProfile
        let baseName: string | null = null;
        let avatar: string | null = developer?.avatar || null;
        let displayName: string | null = developer?.name || null;

        if (developer?.name) {
          // Check if it's a Base name (.base.eth or .minicast)
          if (developer.name.includes('.base.eth') || developer.name.endsWith('.base.eth')) {
            baseName = developer.name;
            displayName = developer.name;
          } else if (developer.name.endsWith('.minicast')) {
            // .minicast names can also be used
            baseName = developer.name;
            displayName = developer.name;
          }
        }

        // If no Base name found, try UserProfile for Farcaster handle or Base name
        if (!baseName) {
          try {
            const userProfileResult = await db.select({
              farcasterHandle: UserProfile.farcasterHandle,
              farcasterFid: UserProfile.farcasterFid,
            })
              .from(UserProfile)
              .where(eq(UserProfile.wallet, user.wallet))
              .limit(1);
            const userProfile = userProfileResult[0];
            
            // If we have a Farcaster handle, we could use it, but Base name takes priority
            // For now, we'll keep checking developer name
          } catch (e) {
            // Ignore
          }
        }

        // If still no display name, generate one from wallet
        if (!displayName) {
          // Check if wallet is a Farcaster wallet
          if (user.wallet.startsWith('farcaster:')) {
            const fid = user.wallet.replace('farcaster:', '');
            displayName = `FID: ${fid}`;
          } else {
            // For Base wallets, try to get Base name from profile API
            try {
              // This would require calling the Base profile API, but to avoid circular calls,
              // we'll just use wallet short format
              displayName = `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`;
            } catch (e) {
              displayName = `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`;
            }
          }
        }

        // Generate avatar if not available
        if (!avatar) {
          if (user.wallet.startsWith('farcaster:')) {
            avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.wallet}&backgroundColor=ffffff&hairColor=77311d`;
          } else {
            avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
          }
        }

        return {
          wallet: user.wallet,
          totalPoints: user.totalPoints || 0,
          name: displayName,
          baseName: baseName,
          avatar: avatar,
          verified: developer?.verified || false,
          streak: streak,
        };
      })
    );

    return NextResponse.json({
      users: usersWithInfo,
      total: usersWithInfo.length,
    });
  } catch (error: any) {
    console.error("Get ranking error:", error);
    return NextResponse.json(
      { users: [], total: 0, error: "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}

