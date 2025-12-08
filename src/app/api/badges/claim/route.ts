import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { mintCastYourAppBadge, mintAppDeveloperBadge, findBadgeTransactionHash } from "@/lib/badgeContract";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const claimSchema = z.object({
  appId: z.string().uuid(),
  badgeType: z.enum(["cast", "developer"]),
});

/**
 * Convert app ID (UUID) to uint256 for contract
 * UUIDs are 128-bit, we'll use a hash-based approach to get a uint256
 */
function appIdToUint256(appId: string): string {
  // Remove hyphens from UUID
  const hex = appId.replace(/-/g, '');
  // UUID is 32 hex chars (128 bits), we need 64 hex chars (256 bits)
  // Pad with zeros or repeat the hex string
  const paddedHex = hex + hex; // Double it to get 256 bits
  // Convert to BigInt and return as string
  return BigInt('0x' + paddedHex).toString();
}

/**
 * Generate metadata JSON for Cast Your App badge
 */
async function generateCastBadgeMetadata(appId: string, appName: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const metadata = {
    name: "Cast Your App Badge",
    description: "Awarded for publishing an approved app on MiniCast Store.",
    image: `${baseUrl}/badges/castyourapptransparent.png`
  };

  // Ensure metadata directory exists
  const metadataDir = join(process.cwd(), "public", "metadata", "cast");
  await mkdir(metadataDir, { recursive: true });

  // Save metadata file
  const metadataPath = join(metadataDir, `${appId}.json`);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  // Return metadata URI (Next.js serves files from public/ automatically)
  return `${baseUrl}/metadata/cast/${appId}.json`;
}

/**
 * Generate metadata JSON for Developer badge
 */
async function generateDeveloperBadgeMetadata(appId: string, appName: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const metadata = {
    name: `${appName} Developer Badge`,
    description: `Official developer of ${appName} on MiniCast Store.`,
    image: `${baseUrl}/badges/${appId}-dev.png`
  };

  // Ensure metadata directory exists
  const metadataDir = join(process.cwd(), "public", "metadata", "developer");
  await mkdir(metadataDir, { recursive: true });

  // Save metadata file
  const metadataPath = join(metadataDir, `${appId}.json`);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  // Return metadata URI (Next.js serves files from public/ automatically)
  return `${baseUrl}/metadata/developer/${appId}.json`;
}

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
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, validated.appId))
      .limit(1);

    const result = appData[0];
    if (!result || !result.developer) {
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

    // Convert app ID to uint256 for contract
    const appIdUint256 = appIdToUint256(validated.appId);

    // CASE 1: CLAIM CAST YOUR APP BADGE
    if (validated.badgeType === "cast") {
      // Check if user is the developer who listed the app
      if (developer.wallet.toLowerCase() !== wallet) {
        return NextResponse.json(
          { error: "Only the developer who listed this app can claim the Cast Your App badge" },
          { status: 403 }
        );
      }

      // Check if Badge record already exists
      const existingBadge = await db.select()
        .from(Badge)
        .where(
          and(
            eq(Badge.appId, validated.appId),
            eq(Badge.badgeType, "cast_your_app"),
            eq(Badge.developerId, developer.id)
          )
        )
        .limit(1);

      if (existingBadge.length > 0) {
        console.log("[Badge Claim] Badge record already exists, returning success");
        return NextResponse.json({
          success: true,
          txHash: existingBadge[0].txHash,
          badgeType: "cast",
          message: "Cast Your App badge already claimed",
        }, { status: 200 });
      }

      // If flag is set but no Badge record exists, create the record without minting
      if (app.castBadgeMinted) {
        console.log("[Badge Claim] Badge was minted (flag=true) but no record exists, creating Badge record...");
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const metadataUri = await generateCastBadgeMetadata(validated.appId, app.name);
        
        // Try to find the transaction hash from blockchain
        const appIdUint256 = appIdToUint256(validated.appId);
        let foundTxHash: string | null = null;
        try {
          foundTxHash = await findBadgeTransactionHash(wallet, appIdUint256, "cast_your_app");
          if (foundTxHash) {
            console.log(`[Badge Claim] Found transaction hash from blockchain: ${foundTxHash}`);
          }
        } catch (txError: any) {
          console.warn("[Badge Claim] Could not fetch transaction hash from blockchain:", txError.message);
        }
        
        try {
          // Create Badge record with found txHash or null
          const [newBadge] = await db.insert(Badge).values({
            name: "Verified Mini Cast Store Badge",
            imageUrl: `${baseUrl}/badges/castapp.webp`,
            appName: app.name,
            appId: validated.appId,
            developerId: developer.id,
            badgeType: "cast_your_app",
            txHash: foundTxHash, // Try to get from blockchain, otherwise null
            claimed: true,
            metadataUri,
            claimedAt: new Date(),
          }).returning();

          console.log("[Badge Claim] Badge record created successfully:", newBadge.id);
          return NextResponse.json({
            success: true,
            txHash: foundTxHash,
            badgeType: "cast",
            message: "Cast Your App badge record created successfully!",
          }, { status: 200 });
        } catch (dbError: any) {
          console.error("[Badge Claim] Error creating badge record:", dbError);
          // If it's a duplicate key error, the badge might have been created by another request
          if (dbError?.code === '23505' || dbError?.message?.includes('duplicate')) {
            // Try to fetch it again
            const retryBadge = await db.select()
              .from(Badge)
              .where(
                and(
                  eq(Badge.appId, validated.appId),
                  eq(Badge.badgeType, "cast_your_app"),
                  eq(Badge.developerId, developer.id)
                )
              )
              .limit(1);
            
            if (retryBadge.length > 0) {
              return NextResponse.json({
                success: true,
                txHash: retryBadge[0].txHash,
                badgeType: "cast",
                message: "Cast Your App badge already claimed",
              }, { status: 200 });
            }
          }
          throw dbError;
        }
      }

      // Generate metadata
      const metadataUri = await generateCastBadgeMetadata(validated.appId, app.name);

      // Mint badge
      let txHash: string;
      try {
        txHash = await mintCastYourAppBadge(wallet, appIdUint256, metadataUri);
      } catch (error: any) {
        console.error("[Badge Claim] Cast badge mint error:", error);
        return NextResponse.json(
          { 
            error: "Failed to mint Cast Your App badge",
            details: error?.message || String(error)
          },
          { status: 500 }
        );
      }

      // Update app record
      await db.update(MiniApp)
        .set({ castBadgeMinted: true })
        .where(eq(MiniApp.id, validated.appId));

      // Create Badge record in database
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      await db.insert(Badge).values({
        name: "Verified Mini Cast Store Badge",
        imageUrl: `${baseUrl}/badges/castapp.webp`,
        appName: app.name,
        appId: validated.appId,
        developerId: developer.id,
        badgeType: "cast_your_app",
        txHash,
        claimed: true,
        metadataUri,
        claimedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        txHash,
        badgeType: "cast",
        message: "Cast Your App badge claimed successfully!",
      }, { status: 201 });
    }

    // CASE 2: CLAIM DEVELOPER BADGE
    if (validated.badgeType === "developer") {
      // Check if badge is ready
      if (!app.developerBadgeReady) {
        return NextResponse.json(
          { 
            error: "Developer badge is being created and will be available soon.",
            message: "Your developer badge is being created and will be available within 24 hours. Please check again later."
          },
          { status: 400 }
        );
      }

      // Check if Badge record already exists
      const existingBadge = await db.select()
        .from(Badge)
        .where(
          and(
            eq(Badge.appId, validated.appId),
            eq(Badge.badgeType, "sbt"),
            eq(Badge.developerId, developer.id)
          )
        )
        .limit(1);

      if (existingBadge.length > 0) {
        return NextResponse.json({
          success: true,
          txHash: existingBadge[0].txHash,
          badgeType: "developer",
          message: "Developer badge already claimed",
        }, { status: 200 });
      }

      // If flag is set but no Badge record exists, create the record without minting
      if (app.developerBadgeMinted) {
        console.log("[Badge Claim] Developer badge was minted but no record exists, creating Badge record...");
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const metadataUri = await generateDeveloperBadgeMetadata(validated.appId, app.name);
        const developerBadgeImage = app.developerBadgeImage || `${baseUrl}/badges/${validated.appId}-dev.png`;
        
        // Try to find the transaction hash from blockchain
        const appIdUint256 = appIdToUint256(validated.appId);
        let foundTxHash: string | null = null;
        try {
          foundTxHash = await findBadgeTransactionHash(wallet, appIdUint256, "sbt");
          if (foundTxHash) {
            console.log(`[Badge Claim] Found transaction hash from blockchain: ${foundTxHash}`);
          }
        } catch (txError: any) {
          console.warn("[Badge Claim] Could not fetch transaction hash from blockchain:", txError.message);
        }
        
        // Create Badge record with found txHash or null
        await db.insert(Badge).values({
          name: `${app.name} Developer Badge`,
          imageUrl: developerBadgeImage,
          appName: app.name,
          appId: validated.appId,
          developerId: developer.id,
          badgeType: "sbt",
          txHash: foundTxHash, // Try to get from blockchain, otherwise null
          claimed: true,
          metadataUri,
          claimedAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          txHash: foundTxHash,
          badgeType: "developer",
          message: "Developer badge record created successfully!",
        }, { status: 200 });
      }

      // Verify wallet is the owner from farcaster.json
      let isOwner = false;
      if (app.farcasterJson) {
        try {
          const farcasterData = JSON.parse(app.farcasterJson);
          const ownerAddress = farcasterData.ownerAddress || farcasterData.owner;
          if (ownerAddress) {
            const normalizedOwner = ownerAddress.toLowerCase().trim();
            isOwner = normalizedOwner === wallet;
          }
        } catch (e) {
          console.error("[Badge Claim] Error parsing farcaster.json:", e);
        }
      }

      if (!isOwner) {
        return NextResponse.json(
          { error: "Only the app owner (from farcaster.json ownerAddress) can claim the developer badge" },
          { status: 403 }
        );
      }

      // Generate metadata
      const metadataUri = await generateDeveloperBadgeMetadata(validated.appId, app.name);

      // Mint badge
      let txHash: string;
      try {
        txHash = await mintAppDeveloperBadge(wallet, appIdUint256, metadataUri);
      } catch (error: any) {
        console.error("[Badge Claim] Developer badge mint error:", error);
        return NextResponse.json(
          { 
            error: "Failed to mint developer badge",
            details: error?.message || String(error)
          },
          { status: 500 }
        );
      }

      // Update app record
      await db.update(MiniApp)
        .set({ developerBadgeMinted: true })
        .where(eq(MiniApp.id, validated.appId));

      // Create Badge record in database
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const developerBadgeImage = app.developerBadgeImage || `${baseUrl}/badges/${validated.appId}-dev.png`;
      await db.insert(Badge).values({
        name: `${app.name} Developer Badge`,
        imageUrl: developerBadgeImage,
        appName: app.name,
        appId: validated.appId,
        developerId: developer.id,
        badgeType: "sbt", // Developer badges are SBT type
        txHash,
        claimed: true,
        metadataUri,
        claimedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        txHash,
        badgeType: "developer",
        message: "Developer badge claimed successfully!",
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid badge type" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[Badge Claim] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to claim badge",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

