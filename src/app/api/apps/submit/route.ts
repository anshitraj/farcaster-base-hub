import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { z } from "zod";
import { fetchFarcasterMetadata } from "@/lib/farcaster-metadata";
import { optimizeDevImage, optimizeBannerImage } from "@/utils/optimizeDevImage";

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
      developer = await prisma.developer.findUnique({
        where: { wallet: wallet.toLowerCase() },
      });

      if (!developer) {
        developer = await prisma.developer.create({
          data: {
            wallet: wallet.toLowerCase(),
          },
        });
      }

      // Check if developer is verified OR if they own the domain via farcaster.json
      // Wallet verification is required (proves identity)
      // Domain ownership via farcaster.json allows auto-approval (proves domain ownership)
      const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified" || developer.verified;
      
      // Require wallet verification (not domain verification)
      // Admins and moderators can bypass verification
      const hasAdminAccess = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
      if (!walletVerified && !hasAdminAccess && !hasReviewMessage) {
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
      if (dbError?.code === 'P1001' || dbError?.message?.includes('Can\'t reach database')) {
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
      existingApp = await prisma.miniApp.findUnique({
        where: { url: validated.url },
        include: {
          developer: {
            select: {
              id: true,
              wallet: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      if (dbError?.code === 'P1001' || dbError?.message?.includes('Can\'t reach database')) {
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
          
          // Re-check approval status when updating (in case developer got verified or farcaster.json was updated)
          let updatedStatus = existingApp.status;
          const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified" || developer.verified;
          
          // If app is not approved, check if it should be approved now
          if (existingApp.status !== "approved") {
            const hasAdminAccess = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
            if (developer.verified || hasAdminAccess) {
              updatedStatus = "approved";
            } else if (walletVerified && isDomainOwner) {
              updatedStatus = "approved";
            }
          }
          
          // Update existing app
          const updatedApp = await prisma.miniApp.update({
            where: { id: existingApp.id },
            data: {
              name: validated.name,
              description: validated.description,
              baseMiniAppUrl: (validated.baseMiniAppUrl && validated.baseMiniAppUrl.trim() !== "") ? validated.baseMiniAppUrl : existingApp.baseMiniAppUrl,
              farcasterUrl: (validated.farcasterUrl && validated.farcasterUrl.trim() !== "") ? validated.farcasterUrl : existingApp.farcasterUrl,
              iconUrl: (validated.iconUrl && validated.iconUrl.trim() !== "") ? validated.iconUrl : existingApp.iconUrl,
              headerImageUrl: (validated.headerImageUrl && validated.headerImageUrl.trim() !== "") ? validated.headerImageUrl : existingApp.headerImageUrl,
              category: validated.category,
              status: updatedStatus, // Update status if it should be approved now
              reviewMessage: (validated.reviewMessage && validated.reviewMessage.trim() !== "") ? validated.reviewMessage : existingApp.reviewMessage,
              notesToAdmin: (validated.notesToAdmin && validated.notesToAdmin.trim() !== "") ? validated.notesToAdmin : existingApp.notesToAdmin,
              developerTags: validated.developerTags || existingApp.developerTags || [],
              tags: (validated.tags && validated.tags.length > 0) ? validated.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0) : existingApp.tags || [],
              contractAddress: (validated.contractAddress && validated.contractAddress.trim() !== "") ? validated.contractAddress.toLowerCase() : existingApp.contractAddress,
              farcasterJson: updatedFarcasterMetadata || existingApp.farcasterJson,
              screenshots: updatedScreenshots,
              lastUpdatedAt: new Date(),
            },
            include: {
              developer: true,
            },
          });

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
    // Determine app status
    // Auto-approve if:
    // - Developer is fully verified/admin, OR
    // - Wallet is verified AND domain ownership is proven via farcaster.json
    // If contract address provided, set to pending_contract
    // If reviewMessage provided, set to pending_review for manual review
    // Otherwise, set to pending
    let appStatus = "pending";
    const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified" || developer.verified;
    
    const hasAdminAccess = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
    if (developer.verified || hasAdminAccess) {
      appStatus = "approved";
    } else if (walletVerified && isDomainOwner) {
      // Wallet verified + domain ownership via farcaster.json = auto-approve
      appStatus = "approved";
    } else if (validated.contractAddress && validated.contractAddress.trim() !== "") {
      appStatus = "pending_contract";
    } else if (hasReviewMessage) {
      appStatus = "pending_review"; // Manual review requested
    }
    
    try {
      app = await prisma.miniApp.create({
        data: {
          name: validated.name,
          description: validated.description,
          url: validated.url,
          baseMiniAppUrl: (validated.baseMiniAppUrl && validated.baseMiniAppUrl.trim() !== "") ? validated.baseMiniAppUrl : null,
          farcasterUrl: (validated.farcasterUrl && validated.farcasterUrl.trim() !== "") ? validated.farcasterUrl : null,
          iconUrl: (validated.iconUrl && validated.iconUrl.trim() !== "") ? optimizeDevImage(validated.iconUrl) : "https://via.placeholder.com/512?text=App+Icon",
          headerImageUrl: (validated.headerImageUrl && validated.headerImageUrl.trim() !== "") ? optimizeBannerImage(validated.headerImageUrl) : null,
          category: validated.category,
          status: appStatus,
          reviewMessage: (validated.reviewMessage && validated.reviewMessage.trim() !== "") ? validated.reviewMessage : null,
          notesToAdmin: (validated.notesToAdmin && validated.notesToAdmin.trim() !== "") ? validated.notesToAdmin : null,
          developerTags: validated.developerTags || [],
          tags: (validated.tags && validated.tags.length > 0) ? validated.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0) : [],
          contractAddress: (validated.contractAddress && validated.contractAddress.trim() !== "") ? validated.contractAddress.toLowerCase() : null,
          contractVerified: false,
          farcasterJson: farcasterMetadata,
          screenshots: (validated.screenshots && validated.screenshots.length > 0) ? validated.screenshots : metadataScreenshots,
          developerId: developer.id,
          clicks: 0,
          installs: 0,
          launchCount: 0,
          uniqueUsers: 0,
          popularityScore: 0,
          ratingAverage: 0,
          ratingCount: 0,
        },
        include: {
          developer: true,
        },
      });
    } catch (dbError: any) {
      if (dbError?.code === 'P1001' || dbError?.message?.includes('Can\'t reach database')) {
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
      // Find or create developer's user points record
      let developerPoints = await prisma.userPoints.findUnique({
        where: { wallet: developer.wallet.toLowerCase() },
      });

      const APP_SUBMISSION_POINTS = 1000;

      if (!developerPoints) {
        developerPoints = await prisma.userPoints.create({
          data: {
            wallet: developer.wallet.toLowerCase(),
            totalPoints: APP_SUBMISSION_POINTS,
          },
        });
      } else {
        developerPoints = await prisma.userPoints.update({
          where: { wallet: developer.wallet.toLowerCase() },
          data: {
            totalPoints: {
              increment: APP_SUBMISSION_POINTS,
            },
          },
        });
      }

      // Create transaction record for developer
      await prisma.pointsTransaction.create({
        data: {
          wallet: developer.wallet.toLowerCase(),
          points: APP_SUBMISSION_POINTS,
          type: "submit",
          description: `Earned ${APP_SUBMISSION_POINTS} points for listing "${validated.name}"`,
          referenceId: app.id,
        },
      });
    } catch (pointsError) {
      // Don't fail the submission if points system has an error
      console.error("Error awarding submission points:", pointsError);
    }

    return NextResponse.json({ 
      app,
      status: appStatus,
      message: appStatus === "approved" 
        ? "App submitted and approved!" 
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

