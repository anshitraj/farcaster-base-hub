import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { mintSBTWithPaymaster } from "@/lib/coinbase-api";
import { generateBadgeSVG, generateBadgeDesign, generateBadgeMetadata } from "@/lib/badge-generator";

const claimSchema = z.object({
  appId: z.string().uuid(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = claimSchema.parse(body);
    const wallet = session.wallet.toLowerCase();

    // Fetch app and developer
    const appData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, validated.appId))
      .limit(1);

    const result = appData[0];
    if (!result) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const { app, developer } = result;

    // Verify app is approved
    if (app.status !== "approved") {
      return NextResponse.json(
        { error: "App must be approved before claiming badge" },
        { status: 400 }
      );
    }

    // Verify developer owns the app
    if (!developer || developer.wallet.toLowerCase() !== wallet) {
      return NextResponse.json(
        { error: "You can only claim badges for your own approved apps" },
        { status: 403 }
      );
    }

    // Convert app.id (UUID string) to uint256 by hashing it
    // Using ethers to hash the UUID string to get a consistent uint256
    const { ethers } = await import("ethers");
    const appIdHash = ethers.keccak256(ethers.toUtf8Bytes(app.id));
    const appId = BigInt(appIdHash) % BigInt(2 ** 256); // Ensure it fits in uint256
    
    // DEBUG: Log the actual values being used
    console.log(`[Badge Claim] DEBUG - App ID: ${app.id}`);
    console.log(`[Badge Claim] DEBUG - Wallet: ${developer.wallet}`);
    console.log(`[Badge Claim] DEBUG - AppId (uint256): ${appId.toString()}`);
    console.log(`[Badge Claim] DEBUG - Contract: ${process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS}`);
    
    // Check the ACTUAL contract state directly
    try {
      const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC);
      const contractAddress = process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS!;
      const contract = new ethers.Contract(contractAddress, [
        "function hasClaimed(address wallet, uint256 appId) external view returns (bool)"
      ], provider);
      
      const contractHasClaimed = await contract.hasClaimed(developer.wallet, appId);
      console.log(`[Badge Claim] DEBUG - Contract hasClaimed(${developer.wallet}, ${appId.toString()}): ${contractHasClaimed}`);
      
      if (contractHasClaimed) {
        // Contract says it's claimed - but check if user actually owns a token
        const { getTokensOf, getBadgeApp } = await import("@/lib/badgeContract");
        const userTokens = await getTokensOf(developer.wallet);
        let ownsToken = false;
        for (const tokenId of userTokens) {
          try {
            const tokenAppId = await getBadgeApp(tokenId);
            if (tokenAppId && tokenAppId.toString() === appId.toString()) {
              ownsToken = true;
              console.log(`[Badge Claim] DEBUG - User DOES own token ${tokenId.toString()} for this appId`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!ownsToken) {
          console.warn(`[Badge Claim] WARNING - Contract hasClaimed=true but user doesn't own token. This might be stale data.`);
          console.warn(`[Badge Claim] WARNING - Will attempt to mint anyway - contract will revert if truly claimed.`);
          // Don't return error here - let it try to mint and see what happens
          // The contract's mint function will check hasClaimed and revert if needed
        }
      }
    } catch (debugError: any) {
      console.error("[Badge Claim] DEBUG - Error checking contract state:", debugError);
    }

    // PRIORITY: Check if user actually owns a token for this appId
    // IGNORE hasClaimed() mapping - it's broken and returns true for everything
    const { getTokensOf, getBadgeApp, findBadgeTransactionHash } = await import("@/lib/badgeContract");
    
    // Check if user actually owns a token for this appId in the CURRENT contract
    let actuallyOwnsBadge = false;
    let matchingTokenId: bigint | null = null;
    try {
      const tokenIds = await getTokensOf(developer.wallet);
      console.log(`[Badge Claim] User has ${tokenIds.length} tokens in current contract`);
      
      // Find the token that matches this appId
      for (const tokenId of tokenIds) {
        try {
          const tokenAppId = await getBadgeApp(tokenId);
          if (tokenAppId && tokenAppId.toString() === appId.toString()) {
            matchingTokenId = tokenId;
            actuallyOwnsBadge = true;
            console.log(`[Badge Claim] Found matching token ${tokenId.toString()} for appId ${appId.toString()}`);
            break;
          }
        } catch (checkError) {
          // Continue checking other tokens
          continue;
        }
      }
    } catch (tokenError: any) {
      console.warn("[Badge Claim] Error checking user tokens:", tokenError.message);
      // If we can't check tokens, assume user doesn't own badge and proceed with mint
    }
    
    // ONLY block if user actually owns the badge token
    // IGNORE hasClaimed() - it's broken/stale
    if (actuallyOwnsBadge) {
      console.log(`[Badge Claim] User actually owns badge for ${developer.wallet}, app: ${app.name}`);
      
      // Check if we have it in the database
      const existingBadge = await db.select()
        .from(Badge)
        .where(
          and(
            eq(Badge.appId, validated.appId),
            eq(Badge.developerId, developer.id)
          )
        )
        .limit(1);
      
      if (existingBadge.length > 0 && existingBadge[0].claimed) {
        // Badge exists in both on-chain and database
        return NextResponse.json(
          { 
            error: "Badge already claimed", 
            badge: existingBadge[0],
            txHash: existingBadge[0].txHash,
            message: existingBadge[0].txHash 
              ? "Badge already claimed. View transaction on BaseScan."
              : "Badge already claimed."
          },
          { status: 400 }
        );
      }
      
      // Badge exists on-chain but not in database - try to sync
      console.log("[Badge Claim] Badge on-chain but missing from database, attempting to sync...");
      try {
        // Try to find transaction hash
        let txHash: string | null = null;
        if (matchingTokenId) {
          txHash = await findBadgeTransactionHash(developer.wallet, appId.toString(), "cast_your_app");
        }
        
        // Return with tx hash even if we can't create DB record
        return NextResponse.json(
          { 
            error: "Badge already claimed on-chain",
            txHash: txHash,
            message: txHash 
              ? "Badge already claimed. View transaction on BaseScan."
              : "Badge already claimed on-chain."
          },
          { status: 400 }
        );
      } catch (syncError: any) {
        console.error("[Badge Claim] Error syncing badge:", syncError);
        return NextResponse.json(
          { 
            error: "Badge already claimed on-chain",
            message: "The badge exists on the blockchain."
          },
          { status: 400 }
        );
      }
    }

    // User doesn't own a token - proceed with claiming
    // IGNORE hasClaimed() mapping - it's broken and returns true for everything
    console.log(`[Badge Claim] User doesn't own badge token, proceeding with claim for ${developer.wallet}, app: ${app.name}`);

    // Use castyourapptransparent.webp for all badges
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const badgeImageUrl = `${baseUrl}/badges/castyourapptransparent.webp`;

    // Generate metadata (for database record, contract uses fixed IPFS URL)
    const metadata = generateBadgeMetadata(
      app.name,
      app.category,
      app.url,
      developer.wallet,
      badgeImageUrl,
      app.id
    );
    // Note: New contract uses fixed IPFS URL, so metadataUri is optional
    const metadataUri = undefined;

    // Note: appId is already calculated above (line 75) - reuse it here
    // Mint badge with Paymaster (gas-free) - new contract uses appId instead of metadataUri
    let txHash: string;
    try {
      txHash = await mintSBTWithPaymaster(
        developer.wallet,
        appId.toString(),
        process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS!
      );
    } catch (error: any) {
      console.error("Mint badge error:", error);
      
      // Check if the error is because badge was already claimed (contract-level check)
      if (error?.message?.includes("Badge already claimed") || 
          error?.reason?.includes("Badge already claimed") ||
          error?.revert?.args?.[0]?.includes("Badge already claimed")) {
        
        console.log("[Badge Claim] Contract rejected mint - badge already claimed. Checking if this is a false positive...");
        
        // Double-check: if contract says claimed but user doesn't own token, it's corrupted state
        const { getTokensOf, getBadgeApp } = await import("@/lib/badgeContract");
        const userTokens = await getTokensOf(developer.wallet);
        let actuallyOwnsToken = false;
        for (const tokenId of userTokens) {
          try {
            const tokenAppId = await getBadgeApp(tokenId);
            if (tokenAppId && tokenAppId.toString() === appId.toString()) {
              actuallyOwnsToken = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!actuallyOwnsToken) {
          // Contract state is corrupted - hasClaimed=true but no token exists
          return NextResponse.json(
            { 
              error: "Contract state corrupted",
              message: `The contract's hasClaimed mapping says this badge is claimed, but you don't own a token. This is a bug in the contract at ${process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS}. You need to deploy a new contract with the resetClaim() function to fix this.`,
              contractAddress: process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS,
              solution: "Deploy the updated contract from contracts/MiniCastBadgeSBT.sol"
            },
            { status: 500 }
          );
        }
        
        // User actually owns token - try to find transaction hash
        console.log("[Badge Claim] User owns token, attempting to find transaction hash...");
        try {
          const { findBadgeTransactionHash } = await import("@/lib/badgeContract");
          let foundTxHash: string | null = null;
          
          // Try to find transaction hash from Transfer events
          foundTxHash = await findBadgeTransactionHash(developer.wallet, appId.toString(), "cast_your_app");
          
          if (foundTxHash) {
            console.log(`[Badge Claim] Found transaction hash: ${foundTxHash}`);
            return NextResponse.json(
              { 
                error: "Badge already claimed for this app",
                txHash: foundTxHash,
                message: `Badge already claimed. View the original transaction on BaseScan.`
              },
              { status: 400 }
            );
          }
          
          // If we can't find the tx hash, still return the error but with helpful message
          return NextResponse.json(
            { 
              error: "Badge already claimed for this app",
              message: "This badge has already been claimed on the blockchain. The contract prevents duplicate claims.",
              contractAddress: process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS
            },
            { status: 400 }
          );
        } catch (findError: any) {
          console.error("[Badge Claim] Error finding transaction hash:", findError);
          return NextResponse.json(
            { 
              error: "Badge already claimed for this app",
              message: "This badge has already been claimed on the blockchain. Unable to retrieve transaction details.",
              contractAddress: process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS
            },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { error: `Failed to mint badge: ${error.message}` },
        { status: 500 }
      );
    }

    // Check if badge record exists in database
    const existingBadgeRecord = await db.select()
      .from(Badge)
      .where(
        and(
          eq(Badge.appId, validated.appId),
          eq(Badge.developerId, developer.id)
        )
      )
      .limit(1);

    // Create or update badge record
    let badge;
    if (existingBadgeRecord.length > 0) {
      // Update existing badge - also update imageUrl to use castyourapptransparent.webp
      const [updated] = await db.update(Badge)
        .set({
          claimed: true,
          txHash,
          imageUrl: badgeImageUrl,
          metadataUri,
          claimedAt: new Date(),
        })
        .where(eq(Badge.id, existingBadgeRecord[0].id))
        .returning();
      badge = updated;
    } else {
      // Create new badge - use castyourapptransparent.webp image
      const [newBadge] = await db.insert(Badge).values({
        name: `${app.name} Builder Badge`,
        imageUrl: badgeImageUrl,
        appName: app.name,
        appId: app.id,
        developerId: developer.id,
        txHash,
        claimed: true,
        metadataUri,
        claimedAt: new Date(),
      }).returning();
      badge = newBadge;
    }

    return NextResponse.json({
      success: true,
      badge,
      message: "Badge claimed successfully!",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Claim badge error:", error);
    return NextResponse.json(
      { error: "Failed to claim badge" },
      { status: 500 }
    );
  }
}

