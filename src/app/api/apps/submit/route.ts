import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { Developer, MiniApp } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { fetchFarcasterMetadata } from "@/lib/farcaster-metadata";
import { convertAndSaveImage, shouldConvertToWebP } from "@/lib/image-optimization";

const submitSchema = z.object({
  name: z.string().min(1, "App name is required").max(100, "App name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  url: z.string().url("Main website URL must be a valid URL"), // Main website URL (required)
  baseMiniAppUrl: z.union([z.string().url(), z.literal("")]).optional(),
  farcasterUrl: z.union([z.string().url(), z.literal("")]).optional(),
  iconUrl: z.union([z.string().url("Icon URL must be a valid URL"), z.literal("")]).optional(),
  headerImageUrl: z.union([z.string().url("Header image URL must be a valid URL"), z.literal("")]).optional(),
  category: z.string().min(1, "Category is required"),
  reviewMessage: z.union([z.string().max(1000), z.literal("")]).optional(),
  developerTags: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).max(5, "Maximum 5 tags allowed").optional().default([]), // App tags for search (e.g., "airdrop", "defi", "tools")
  contractAddress: z.union([z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"), z.literal("")]).optional(),
  notesToAdmin: z.union([z.string().max(1000), z.literal("")]).optional(),
  screenshots: z.array(z.string().url("Screenshot URL must be a valid URL")).optional().default([]), // Screenshot URLs
  supportEmail: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  twitterUrl: z.union([z.string(), z.literal("")]).optional(), // Can be URL or username
});

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

    const body = await request.json();
    const validated = submitSchema.parse(body);

    // Validate tags: max 5 and normalize to lowercase
    if (validated.tags && validated.tags.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 tags allowed" },
        { status: 400 }
      );
    }

    // Normalize tags to lowercase
    const normalizedTags = validated.tags
      ? validated.tags.map((tag) => tag.toLowerCase().trim()).filter((tag) => tag.length > 0)
      : [];
    
    if (normalizedTags.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 tags allowed" },
        { status: 400 }
      );
    }

    // Update validated tags with normalized version
    validated.tags = normalizedTags;

    // Validate URL starts with https://
    if (!validated.url.startsWith("https://")) {
      return NextResponse.json(
        { error: "URL must use HTTPS" },
        { status: 400 }
      );
    }

    // Validate contract address if provided
    if (validated.contractAddress && validated.contractAddress.trim() !== "") {
      if (!/^0x[a-fA-F0-9]{40}$/.test(validated.contractAddress)) {
        return NextResponse.json(
          { error: "Invalid contract address format" },
          { status: 400 }
        );
      }
    }

    // Check if review message is provided (used later for status determination)
    const hasReviewMessage = validated.reviewMessage && validated.reviewMessage.trim().length > 0;
    
    // Auto-fetch farcaster.json metadata and check ownership
    let farcasterMetadata: string | null = null;
    let metadataScreenshots: string[] = [];
    let isDomainOwner = false; // Track if wallet is in farcaster.json owners
    const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665"; // Default owner address for Base/Farcaster
    try {
      const metadata = await fetchFarcasterMetadata(validated.url);
      if (metadata) {
        // Ensure owner address is included in metadata
        const metadataWithOwner = {
          ...metadata,
          owner: metadata.owner || metadata.owners || DEFAULT_OWNER_ADDRESS,
          owners: metadata.owners || metadata.owner || DEFAULT_OWNER_ADDRESS,
        };
        farcasterMetadata = JSON.stringify(metadataWithOwner);
        metadataScreenshots = metadata.screenshots || [];
        
        // Check if wallet is in farcaster.json owners
        try {
          const parsedMetadata = metadataWithOwner;
          const owners = parsedMetadata.owner || parsedMetadata.owners || [];
          const ownerList = Array.isArray(owners) ? owners : [owners];
          const normalizedOwners = ownerList.map((owner: string) => 
            owner.toLowerCase().trim()
          );
          
          if (normalizedOwners.includes(wallet.toLowerCase())) {
            isDomainOwner = true;
          }
        } catch (e) {
          console.log("Error parsing farcaster.json for ownership:", e);
        }
        
        // Auto-fill fields if not provided
        if (!validated.name && metadata.name) {
          validated.name = metadata.name;
        }
        if (!validated.description && metadata.description) {
          validated.description = metadata.description;
        }
        // Try icon from metadata, or check for /.well-known/icon.png
        if (!validated.iconUrl) {
          if (metadata.icon) {
            validated.iconUrl = metadata.icon;
          } else {
            // Try to fetch icon.png from /.well-known/
            try {
              const normalizedUrl = validated.url.replace(/\/$/, "");
              const iconPngUrl = `${normalizedUrl}/.well-known/icon.png`;
              const iconResponse = await fetch(iconPngUrl, {
                method: "HEAD",
                signal: AbortSignal.timeout(5000),
              });
              if (iconResponse.ok) {
                validated.iconUrl = iconPngUrl;
              }
            } catch (e) {
              // Icon.png doesn't exist, will use placeholder or empty
              console.log("icon.png not found at /.well-known/icon.png");
            }
          }
        }
        if (!validated.category && metadata.category) {
          validated.category = metadata.category;
        }
        // Auto-fill header image from ogImage if not provided
        if (!validated.headerImageUrl && metadata.ogImage) {
          validated.headerImageUrl = metadata.ogImage;
        }
      }
    } catch (metadataError) {
      // Silently fail - metadata fetch is optional
      console.log("Metadata fetch failed (optional):", metadataError);
    }
    
    // If metadata was not fetched, create a minimal metadata object with owner address
    if (!farcasterMetadata) {
      const minimalMetadata = {
        owner: DEFAULT_OWNER_ADDRESS,
        owners: DEFAULT_OWNER_ADDRESS,
      };
      farcasterMetadata = JSON.stringify(minimalMetadata);
    }

    // Find or create developer
    let developer;
    try {
      const walletLower = wallet.toLowerCase();
      let developerResult = await db.select().from(Developer)
        .where(eq(Developer.wallet, walletLower))
        .limit(1);
      developer = developerResult[0];

      if (!developer) {
        const [newDeveloper] = await db.insert(Developer).values({
          wallet: walletLower,
        }).returning();
        developer = newDeveloper;
      }

      // Check if developer is verified (wallet verification)
      const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified" || developer.verified;
      
      // All apps must go through admin approval - no auto-approval
      // Exception: If owner address from farcaster.json matches verified address, 
      // they can list but app will be unverified (verified=false) and pending admin approval
      const hasAdminAccess = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
      
      // Only require wallet verification if they're not the owner from farcaster.json
      // If they're the owner, they can list but it will be unverified
      if (!isDomainOwner && !walletVerified && !hasAdminAccess && !hasReviewMessage) {
        return NextResponse.json(
          { 
            error: "You must verify your wallet before submitting apps, or request manual review.",
            requiresVerification: true,
            verificationStatus: developer.verificationStatus,
          },
          { status: 403 }
        );
      }
    } catch (dbError: any) {
      // If database is unavailable, return error
      if (dbError?.message?.includes('connection') || dbError?.message?.includes('database')) {
        return NextResponse.json(
          { error: "Database temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      throw dbError;
    }

    // Check if URL already exists
    let existingApp;
    try {
      const existingAppResult = await db.select({
        app: MiniApp,
        developer: {
          id: Developer.id,
          wallet: Developer.wallet,
        },
      })
        .from(MiniApp)
        .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
        .where(eq(MiniApp.url, validated.url))
        .limit(1);
      existingApp = existingAppResult[0] ? {
        ...existingAppResult[0].app,
        developer: existingAppResult[0].developer,
      } : null;
    } catch (dbError: any) {
      if (dbError?.message?.includes('connection') || dbError?.message?.includes('database')) {
        return NextResponse.json(
          { error: "Database temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      throw dbError;
    }

    if (existingApp) {
      // Check if the existing app belongs to the current developer
      if (existingApp.developerId === developer.id) {
        // Developer owns this app - update it instead of creating new
        try {
          // Re-fetch metadata to update
          let updatedFarcasterMetadata = farcasterMetadata;
          let updatedScreenshots: string[] = [];
          // Use form screenshots if provided, otherwise use metadata screenshots, otherwise keep existing
          if (validated.screenshots && validated.screenshots.length > 0) {
            updatedScreenshots = validated.screenshots;
          } else if (metadataScreenshots.length > 0) {
            updatedScreenshots = metadataScreenshots;
          } else if (!updatedFarcasterMetadata) {
            try {
              const metadata = await fetchFarcasterMetadata(validated.url);
              if (metadata) {
                // Ensure owner address is included
                const metadataWithOwner = {
                  ...metadata,
                  owner: metadata.owner || metadata.owners || DEFAULT_OWNER_ADDRESS,
                  owners: metadata.owners || metadata.owner || DEFAULT_OWNER_ADDRESS,
                };
                updatedFarcasterMetadata = JSON.stringify(metadataWithOwner);
                updatedScreenshots = metadata.screenshots || existingApp.screenshots || [];
              } else {
                updatedScreenshots = existingApp.screenshots || [];
              }
            } catch (e) {
              // Use existing metadata if fetch fails
              updatedFarcasterMetadata = existingApp.farcasterJson;
              updatedScreenshots = existingApp.screenshots || [];
            }
          } else {
            updatedScreenshots = existingApp.screenshots || [];
          }
          
          // Re-check approval status when updating
          // All apps must go through admin approval - no auto-approval
          let updatedStatus = existingApp.status;
          const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified" || developer.verified;
          
          // Only admins can approve - keep existing status unless admin approved it
          // If status was already approved, keep it (admin must have approved it)
          // Otherwise, keep it as pending/pending_review/pending_contract
          if (existingApp.status === "approved") {
            // Keep approved status if it was already approved
            updatedStatus = "approved";
          } else {
            // Keep the existing pending status - admin needs to approve
            updatedStatus = existingApp.status;
          }
          
          // Re-check if owner matches (in case farcaster.json was updated)
          let updatedIsDomainOwner = false;
          if (updatedFarcasterMetadata) {
            try {
              const parsedMetadata = JSON.parse(updatedFarcasterMetadata);
              const owners = parsedMetadata.owner || parsedMetadata.owners || [];
              const ownerList = Array.isArray(owners) ? owners : [owners];
              const normalizedOwners = ownerList.map((owner: string) => 
                owner.toLowerCase().trim()
              );
              
              if (normalizedOwners.includes(wallet.toLowerCase())) {
                updatedIsDomainOwner = true;
              }
            } catch (e) {
              console.log("Error parsing farcaster.json for ownership:", e);
            }
          }
          
          // Determine verified status and approval status
          let updatedVerified = existingApp.verified;
          const hasAdminAccess = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
          
          // If app was already approved by admin, keep it verified
          if (existingApp.status === "approved" && existingApp.verified) {
            // Keep verified if admin already approved
            updatedVerified = true;
            updatedStatus = "approved";
          } else if (updatedIsDomainOwner && walletVerified && !hasAdminAccess) {
            // Owner can list (status=approved) but app remains unverified until admin approves
            updatedStatus = "approved";
            updatedVerified = false;
          } else if (hasAdminAccess) {
            // Admins can approve and verify
            updatedStatus = "approved";
            updatedVerified = true;
          } else {
            // Default: keep existing status, unverified until admin approves
            updatedVerified = false;
          }
          
          // Update existing app
          const updateData: any = {
            name: validated.name,
            description: validated.description,
            baseMiniAppUrl: (validated.baseMiniAppUrl && validated.baseMiniAppUrl.trim() !== "") ? validated.baseMiniAppUrl : existingApp.baseMiniAppUrl,
            farcasterUrl: (validated.farcasterUrl && validated.farcasterUrl.trim() !== "") ? validated.farcasterUrl : existingApp.farcasterUrl,
            iconUrl: (validated.iconUrl && validated.iconUrl.trim() !== "") ? validated.iconUrl : existingApp.iconUrl,
            headerImageUrl: (validated.headerImageUrl && validated.headerImageUrl.trim() !== "") ? validated.headerImageUrl : existingApp.headerImageUrl,
            category: validated.category,
            status: updatedStatus, // Update status (approved if owner matches, otherwise keep existing)
            verified: updatedVerified, // Update verified status
            reviewMessage: (validated.reviewMessage && validated.reviewMessage.trim() !== "") ? validated.reviewMessage : existingApp.reviewMessage,
            notesToAdmin: (validated.notesToAdmin && validated.notesToAdmin.trim() !== "") ? validated.notesToAdmin : existingApp.notesToAdmin,
            developerTags: validated.developerTags || existingApp.developerTags || [],
            tags: (validated.tags && validated.tags.length > 0) ? validated.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0) : existingApp.tags || [],
            contractAddress: (validated.contractAddress && validated.contractAddress.trim() !== "") ? validated.contractAddress.toLowerCase() : existingApp.contractAddress,
            farcasterJson: updatedFarcasterMetadata || existingApp.farcasterJson,
            screenshots: updatedScreenshots || existingApp.screenshots || [],
            lastUpdatedAt: new Date(),
          };
          
          // Add supportEmail and twitterUrl if provided
          if (validated.supportEmail && validated.supportEmail.trim() !== "") {
            updateData.supportEmail = validated.supportEmail.trim();
          } else if (existingApp.supportEmail) {
            updateData.supportEmail = existingApp.supportEmail;
          }
          
          if (validated.twitterUrl && validated.twitterUrl.trim() !== "") {
            updateData.twitterUrl = validated.twitterUrl.trim();
          } else if (existingApp.twitterUrl) {
            updateData.twitterUrl = existingApp.twitterUrl;
          }
          
          const [updatedAppData] = await db.update(MiniApp)
            .set(updateData)
            .where(eq(MiniApp.id, existingApp.id))
            .returning();
          
          // Fetch developer for response
          const devResult = await db.select().from(Developer).where(eq(Developer.id, developer.id)).limit(1);
          const updatedApp = {
            ...updatedAppData,
            developer: devResult[0],
          };

          return NextResponse.json({ 
            app: updatedApp,
            status: updatedApp.status,
            message: "App updated successfully!",
            updated: true,
          }, { status: 200 });
        } catch (updateError: any) {
          console.error("Error updating app:", updateError);
          return NextResponse.json(
            { 
              error: "Failed to update app",
              message: updateError.message || "An error occurred while updating the app"
            },
            { status: 500 }
          );
        }
      } else {
        // App exists but belongs to different developer
        return NextResponse.json(
          { 
            error: "An app with this URL already exists",
            message: `This URL is already registered by another developer. If this is your app, please contact support.`,
            existingAppId: existingApp.id
          },
          { status: 409 }
        );
      }
    }

    // Create mini app
    let app;
    // Determine app status - ALL apps must go through admin approval
    // Exception: If owner address from farcaster.json matches verified address,
    // they can list (status=approved) but app will be unverified (verified=false)
    let appStatus = "pending";
    let appVerified = false; // Default to unverified - admin must approve
    
    const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified" || developer.verified;
    const hasAdminAccess = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
    
    // If owner address from farcaster.json matches verified address, allow listing but mark as unverified
    if (isDomainOwner && walletVerified) {
      // Owner can list (status=approved so it's visible), but app is unverified (verified=false)
      appStatus = "approved";
      appVerified = false; // Unverified badge will be shown
    } else if (hasAdminAccess) {
      // Admins can auto-approve and verify
      appStatus = "approved";
      appVerified = true;
    } else if (validated.contractAddress && validated.contractAddress.trim() !== "") {
      appStatus = "pending_contract";
      appVerified = false;
    } else if (hasReviewMessage) {
      appStatus = "pending_review"; // Manual review requested
      appVerified = false;
    } else {
      // Default: pending admin approval, unverified
      appStatus = "pending";
      appVerified = false;
    }
    
    // Convert PNG/JPG images to WebP before saving
    let finalIconUrl = (validated.iconUrl && validated.iconUrl.trim() !== "") ? validated.iconUrl : "/placeholder-icon.png";
    let finalHeaderImageUrl = (validated.headerImageUrl && validated.headerImageUrl.trim() !== "") ? validated.headerImageUrl : null;
    let finalScreenshots = (validated.screenshots && validated.screenshots.length > 0) ? validated.screenshots : metadataScreenshots;

    // Generate a temporary ID for filename prefix (we'll use a UUID-like string)
    const tempId = `temp-${Date.now()}`;

    // Convert icon if PNG/JPG
    if (finalIconUrl && shouldConvertToWebP(finalIconUrl)) {
      const convertedIcon = await convertAndSaveImage(finalIconUrl, "icons", tempId);
      if (convertedIcon) finalIconUrl = convertedIcon;
    }

    // Convert header if PNG/JPG
    if (finalHeaderImageUrl && shouldConvertToWebP(finalHeaderImageUrl)) {
      const convertedHeader = await convertAndSaveImage(finalHeaderImageUrl, "headers", tempId);
      if (convertedHeader) finalHeaderImageUrl = convertedHeader;
    }

    // Convert screenshots if PNG/JPG
    if (finalScreenshots && finalScreenshots.length > 0) {
      finalScreenshots = await Promise.all(
        finalScreenshots.map(async (url) => {
          if (shouldConvertToWebP(url)) {
            const converted = await convertAndSaveImage(url, "screenshots", tempId);
            return converted || url;
          }
          return url;
        })
      );
    }
    
    try {
      const insertData: any = {
        name: validated.name,
        description: validated.description,
        url: validated.url,
        baseMiniAppUrl: (validated.baseMiniAppUrl && validated.baseMiniAppUrl.trim() !== "") ? validated.baseMiniAppUrl : null,
        farcasterUrl: (validated.farcasterUrl && validated.farcasterUrl.trim() !== "") ? validated.farcasterUrl : null,
        iconUrl: finalIconUrl,
        headerImageUrl: finalHeaderImageUrl,
        category: validated.category,
        status: appStatus,
        verified: appVerified, // Set verified status (false for unverified apps)
        reviewMessage: (validated.reviewMessage && validated.reviewMessage.trim() !== "") ? validated.reviewMessage : null,
        notesToAdmin: (validated.notesToAdmin && validated.notesToAdmin.trim() !== "") ? validated.notesToAdmin : null,
        developerTags: validated.developerTags || [],
        tags: (validated.tags && validated.tags.length > 0) ? validated.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0) : [],
        contractAddress: (validated.contractAddress && validated.contractAddress.trim() !== "") ? validated.contractAddress.toLowerCase() : null,
        contractVerified: false,
        farcasterJson: farcasterMetadata,
        screenshots: finalScreenshots,
        developerId: developer.id,
        clicks: 0,
        installs: 0,
        launchCount: 0,
        uniqueUsers: 0,
        popularityScore: 0,
        ratingAverage: 0,
        ratingCount: 0,
      };
      
      // Add supportEmail and twitterUrl if provided
      if (validated.supportEmail && validated.supportEmail.trim() !== "") {
        insertData.supportEmail = validated.supportEmail.trim();
      }
      
      if (validated.twitterUrl && validated.twitterUrl.trim() !== "") {
        insertData.twitterUrl = validated.twitterUrl.trim();
      }
      
      const [newApp] = await db.insert(MiniApp).values(insertData).returning();
      
      // Fetch developer for response
      const devResult = await db.select().from(Developer).where(eq(Developer.id, developer.id)).limit(1);
      app = {
        ...newApp,
        developer: devResult[0],
      };
    } catch (dbError: any) {
      if (dbError?.message?.includes('connection') || dbError?.message?.includes('database')) {
        return NextResponse.json(
          { error: "Database temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      // Handle Prisma schema errors (e.g., missing field)
      if (dbError?.code === 'P2009' || dbError?.message?.includes('Unknown argument') || dbError?.message?.includes('Unknown field')) {
        console.error("Database schema error - may need migration:", dbError);
        return NextResponse.json(
          { 
            error: "Database schema error. Please run database migrations.",
            message: "The database schema may be out of date. Please contact support or run migrations."
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    // Award 1000 points to developer for listing their app
    try {
      const { UserPoints, PointsTransaction } = await import("@/db/schema");
      const devWalletLower = developer.wallet.toLowerCase();
      // Find or create developer's user points record
      let developerPointsResult = await db.select().from(UserPoints)
        .where(eq(UserPoints.wallet, devWalletLower))
        .limit(1);
      let developerPoints = developerPointsResult[0];

      const APP_SUBMISSION_POINTS = 1000;

      if (!developerPoints) {
        const [newPoints] = await db.insert(UserPoints).values({
          wallet: devWalletLower,
          totalPoints: APP_SUBMISSION_POINTS,
        }).returning();
        developerPoints = newPoints;
      } else {
        const [updatedPoints] = await db.update(UserPoints)
          .set({
            totalPoints: developerPoints.totalPoints + APP_SUBMISSION_POINTS,
          })
          .where(eq(UserPoints.wallet, devWalletLower))
          .returning();
        developerPoints = updatedPoints;
      }

      // Create transaction record for developer
      await db.insert(PointsTransaction).values({
        wallet: devWalletLower,
        points: APP_SUBMISSION_POINTS,
        type: "submit",
        description: `Earned ${APP_SUBMISSION_POINTS} points for listing "${validated.name}"`,
        referenceId: app.id,
      });
    } catch (pointsError) {
      // Don't fail the submission if points system has an error
      console.error("Error awarding submission points:", pointsError);
    }

    return NextResponse.json({ 
      app,
      status: appStatus,
      verified: appVerified,
      message: appStatus === "approved" 
        ? "App submitted and approved!" 
        : isDomainOwner && walletVerified
        ? "App submitted successfully! Since you're the owner from farcaster.json, your app is listed but marked as unverified. An admin will review and verify it shortly."
        : "App submitted for review. An admin will review it shortly.",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors for better user experience
      const errorMessages = error.errors.map((err) => {
        const field = err.path.join(".");
        return `${field}: ${err.message}`;
      });
      
      return NextResponse.json(
        { 
          error: "Validation error", 
          details: error.errors,
          message: errorMessages.join(", ") || "Please check all required fields"
        },
        { status: 400 }
      );
    }

    console.error("Submit app error:", error);
    
    // Return more detailed error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : "Failed to submit app";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

