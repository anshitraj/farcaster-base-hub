import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { mintBadge, hasClaimedBadge, getTokensOf, getBadgeApp, findBadgeTransactionHash } from "@/lib/badgeContract";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const mintSchema = z.object({
  developerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  appId: z.string().uuid(),
  badgeType: z.enum(["sbt", "cast_your_app"]), // "sbt" for owner badges, "cast_your_app" for lister badges
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    const body = await request.json();
    const validated = mintSchema.parse(body);

    // Authenticate: only allow if session wallet == developerWallet OR admin
    if (!session || session.wallet.toLowerCase() !== validated.developerWallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch app and developer
    const appResult = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, validated.appId))
      .limit(1);
    const appData = appResult[0];
    if (!appData) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const wallet = validated.developerWallet.toLowerCase();
    
    // Check if wallet is the owner (from farcaster.json)
    let isOwner = false;
    if (app.farcasterJson) {
      try {
        const farcasterData = JSON.parse(app.farcasterJson);
        const owners = farcasterData.owner || farcasterData.owners || [];
        const ownerList = Array.isArray(owners) ? owners : [owners];
        const normalizedOwners = ownerList.map((owner: string) => 
          owner.toLowerCase().trim()
        );
        
        if (normalizedOwners.includes(wallet)) {
          isOwner = true;
        }
      } catch (e) {
        console.error("Error parsing farcaster.json:", e);
      }
    }
    
    // Check if wallet is the developer who listed the app
    const isLister = app.developer?.wallet.toLowerCase() === wallet;
    
    // Validate badge type eligibility
    if (validated.badgeType === "sbt") {
      // SBT badge: only for owners from farcaster.json
      if (!isOwner) {
        return NextResponse.json(
          { error: "You are not the owner of this app. Your wallet must be in the farcaster.json owner field to claim the SBT badge." },
          { status: 403 }
        );
      }
    } else if (validated.badgeType === "cast_your_app") {
      // Cast Your App badge: only for developers who listed the app
      if (!isLister) {
        return NextResponse.json(
          { error: "You are not the developer who listed this app. Only the app lister can claim the 'Cast Your App' badge." },
          { status: 403 }
        );
      }
      
      // App must be approved for Cast Your App badge
      if (app.status !== "approved") {
        return NextResponse.json(
          { error: "App must be approved before you can claim the 'Cast Your App' badge." },
          { status: 403 }
        );
      }
    }
    
    // Check if user already has this badge type for this app
    if (!app.developer) {
      return NextResponse.json(
        { error: "Developer not found for this app" },
        { status: 404 }
      );
    }

    // Convert app.id (UUID string) to uint256 by hashing it
    // Using ethers to hash the UUID string to get a consistent uint256
    const { ethers } = await import("ethers");
    const appIdHash = ethers.keccak256(ethers.toUtf8Bytes(app.id));
    const appId = BigInt(appIdHash) % BigInt(2 ** 256); // Ensure it fits in uint256

    // PRIORITY: Check on-chain first (source of truth) - database may have old records from previous contract
    const alreadyClaimedOnChain = await hasClaimedBadge(wallet, appId.toString());
    
    if (alreadyClaimedOnChain) {
      console.log(`[Badge Mint] Badge already claimed on-chain for ${wallet}, app: ${app.name}`);
      
      // Check if we have it in the database
      const existingBadge = await db.select()
        .from(Badge)
        .where(
          and(
            eq(Badge.appId, validated.appId),
            eq(Badge.developerId, app.developer.id),
            eq(Badge.badgeType, validated.badgeType),
            eq(Badge.claimed, true)
          )
        )
        .limit(1);
      
      if (existingBadge.length > 0) {
        // Badge exists in both on-chain and database
        return NextResponse.json({
          badge: existingBadge[0],
          txHash: existingBadge[0].txHash,
          message: `Badge already claimed. You have already claimed the ${validated.badgeType === "sbt" ? "SBT" : "Cast Your App"} badge for this app.`,
        }, { status: 200 });
      }
      
      // Badge exists on-chain but not in database - try to sync
      console.log("[Badge Mint] Badge on-chain but missing from database, attempting to sync...");
      try {
        // Get all tokens for this wallet
        const tokenIds = await getTokensOf(wallet);
        
        // Find the token that matches this appId
        let matchingTokenId: bigint | null = null;
        for (const tokenId of tokenIds) {
          const tokenAppId = await getBadgeApp(tokenId);
          if (tokenAppId && tokenAppId.toString() === appId.toString()) {
            matchingTokenId = tokenId;
            break;
          }
        }
        
        // Try to find transaction hash
        let txHash: string | null = null;
        if (matchingTokenId) {
          txHash = await findBadgeTransactionHash(wallet, appId.toString(), validated.badgeType);
        }
        
        // Create database record
        const badgeName = validated.badgeType === "sbt" 
          ? `Built ${app.name} on Base`
          : `Cast Your App: ${app.name}`;
        
        // Use castyourapptransparent.webp for all badges
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const badgeImageUrl = `${baseUrl}/badges/castyourapptransparent.webp`;
        
        const [badge] = await db.insert(Badge).values({
          name: badgeName,
          imageUrl: badgeImageUrl,
          appName: app.name,
          appId: app.id,
          developerId: app.developer.id,
          badgeType: validated.badgeType,
          txHash: txHash || undefined,
          claimed: true,
          claimedAt: new Date(),
        }).returning();
        
        return NextResponse.json({
          badge,
          txHash: badge.txHash,
          message: "Badge synced from blockchain",
        }, { status: 200 });
      } catch (syncError: any) {
        console.error("[Badge Mint] Error syncing badge:", syncError);
        // Try to find transaction hash one more time before returning error
        let foundTxHash: string | null = null;
        try {
          const tokenIds = await getTokensOf(wallet);
          for (const tokenId of tokenIds) {
            const tokenAppId = await getBadgeApp(tokenId);
            if (tokenAppId && tokenAppId.toString() === appId.toString()) {
              foundTxHash = await findBadgeTransactionHash(wallet, appId.toString(), validated.badgeType);
              break;
            }
          }
        } catch (findError) {
          console.error("[Badge Mint] Error finding transaction hash:", findError);
        }
        
        return NextResponse.json(
          { 
            error: "Badge already claimed on-chain but could not sync to database",
            details: "The badge exists on the blockchain. Please contact support if you need assistance.",
            txHash: foundTxHash,
            onChain: true
          },
          { status: 409 }
        );
      }
    }

    // Badge not claimed on-chain - proceed with minting even if database has old record
    // (Database may have old records from previous contract)
    console.log(`[Badge Mint] Badge not claimed on-chain, proceeding with mint for ${wallet}, app: ${app.name}`);

    // Build metadata JSON based on badge type
    const badgeName = validated.badgeType === "sbt" 
      ? `Built ${app.name} on Base`
      : `Cast Your App: ${app.name}`;
    const badgeDescription = validated.badgeType === "sbt"
      ? `SBT badge for owning ${app.name} on Base`
      : `Cast Your App badge for listing ${app.name} on Base`;
    
    const metadata = {
      name: badgeName,
      description: badgeDescription,
      image: app.iconUrl,
      attributes: [
        { trait_type: "App Name", value: app.name },
        { trait_type: "Developer", value: app.developer.wallet },
        { trait_type: "App URL", value: app.url },
        { trait_type: "Badge Type", value: validated.badgeType },
        { trait_type: "Created", value: app.createdAt.toISOString() },
      ],
    };

    // Badge not claimed on-chain, proceed with minting
    let txHash: string;
    try {
      console.log(`[Badge Mint] Attempting to mint badge for ${validated.developerWallet}, app: ${app.name}, type: ${validated.badgeType}`);
      console.log(`[Badge Mint] App ID (hashed): ${appId.toString()}`);
      txHash = await mintBadge(validated.developerWallet, appId.toString());
      console.log(`[Badge Mint] Success! Transaction hash: ${txHash}`);
    } catch (error: any) {
      console.error("[Badge Mint] Mint badge error:", error);
      console.error("[Badge Mint] Error details:", {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        reason: error?.reason,
      });
      
      // Check if the error is because badge was already claimed (race condition)
      if (error?.message?.includes("Badge already claimed") || error?.reason?.includes("Badge already claimed")) {
        // Retry the on-chain check and sync
        const retryClaimed = await hasClaimedBadge(wallet, appId.toString());
        if (retryClaimed) {
          // Badge was just minted, try to sync
          const existingBadge = await db.select()
            .from(Badge)
            .where(
              and(
                eq(Badge.appId, validated.appId),
                eq(Badge.developerId, app.developer.id),
                eq(Badge.badgeType, validated.badgeType),
                eq(Badge.claimed, true)
              )
            )
            .limit(1);
          
          if (existingBadge.length > 0) {
            return NextResponse.json({
              badge: existingBadge[0],
              txHash: existingBadge[0].txHash,
              message: "Badge already claimed",
            }, { status: 200 });
          }
          
          // Badge exists on-chain but not in DB - try to find tx hash
          try {
            const tokenIds = await getTokensOf(wallet);
            let matchingTokenId: bigint | null = null;
            for (const tokenId of tokenIds) {
              const tokenAppId = await getBadgeApp(tokenId);
              if (tokenAppId && tokenAppId.toString() === appId.toString()) {
                matchingTokenId = tokenId;
                break;
              }
            }
            
            let foundTxHash: string | null = null;
            if (matchingTokenId) {
              foundTxHash = await findBadgeTransactionHash(wallet, appId.toString(), validated.badgeType);
            }
            
            // Return the found transaction hash even if we can't create DB record
            return NextResponse.json({
              error: "Badge already claimed for this app",
              txHash: foundTxHash,
              message: foundTxHash 
                ? "Badge already claimed. View transaction on BaseScan."
                : "Badge already claimed for this app.",
            }, { status: 400 });
          } catch (findError) {
            console.error("[Badge Mint] Error finding transaction hash:", findError);
          }
        }
        
        // Return error with message about already claimed
        return NextResponse.json({
          error: "Badge already claimed for this app",
          message: "This badge has already been claimed. Each user can only claim one badge per app.",
        }, { status: 400 });
      }
      
      // Check if it's a timeout error
      const isTimeout = error?.message?.includes("timeout") || 
                       error?.code === "TIMEOUT" ||
                       error?.message?.includes("TIMEOUT");
      
      return NextResponse.json(
        { 
          status: 500,
          error: isTimeout 
            ? "Failed to mint Cast Your App badge" 
            : "Failed to mint badge. Check contract configuration.",
          details: isTimeout
            ? "request timeout (code=TIMEOUT, version=6.15.0)"
            : error?.message || String(error),
          fullResponse: {
            message: error?.message,
            code: error?.code,
            reason: error?.reason,
          }
        },
        { status: 500 }
      );
    }

    // Use castyourapptransparent.webp for all badges
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const badgeImageUrl = `${baseUrl}/badges/castyourapptransparent.webp`;
    
    // Create badge record
    const [badge] = await db.insert(Badge).values({
      name: badgeName,
      imageUrl: badgeImageUrl,
      appName: app.name,
      appId: app.id,
      developerId: app.developer.id,
      badgeType: validated.badgeType,
      txHash,
      claimed: true,
      claimedAt: new Date(),
    }).returning();

    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Mint badge error:", error);
    return NextResponse.json(
      { error: "Failed to mint badge" },
      { status: 500 }
    );
  }
}

