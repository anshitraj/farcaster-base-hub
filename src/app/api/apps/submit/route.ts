import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { z } from "zod";
import { fetchFarcasterMetadata } from "@/lib/farcaster-metadata";

const submitSchema = z.object({
  name: z.string().min(1, "App name is required").max(100, "App name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  url: z.string().url("Main website URL must be a valid URL"), // Main website URL (required)
  baseMiniAppUrl: z.union([z.string().url(), z.literal("")]).optional(),
  farcasterUrl: z.union([z.string().url(), z.literal("")]).optional(),
  iconUrl: z.union([z.string().url("Icon URL must be a valid URL"), z.literal("")]).optional(),
  category: z.string().min(1, "Category is required"),
  reviewMessage: z.union([z.string().max(1000), z.literal("")]).optional(),
  developerTags: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]), // App tags for search (e.g., "business", "payment", "airdrops")
  contractAddress: z.union([z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"), z.literal("")]).optional(),
  notesToAdmin: z.union([z.string().max(1000), z.literal("")]).optional(),
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

    // Auto-fetch farcaster.json metadata
    let farcasterMetadata = null;
    let screenshots: string[] = [];
    try {
      const metadata = await fetchFarcasterMetadata(validated.url);
      if (metadata) {
        farcasterMetadata = JSON.stringify(metadata);
        screenshots = metadata.screenshots || [];
        
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
      }
    } catch (metadataError) {
      // Silently fail - metadata fetch is optional
      console.log("Metadata fetch failed (optional):", metadataError);
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

      // Check if developer is verified (unless submitting for manual review)
      // If reviewMessage is provided, allow submission even if not verified
      const hasReviewMessage = validated.reviewMessage && validated.reviewMessage.trim().length > 0;
      
      if (!developer.verified && !developer.isAdmin && !hasReviewMessage) {
        return NextResponse.json(
          { 
            error: "You must verify your developer account before submitting apps, or request manual review.",
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
      return NextResponse.json(
        { error: "An app with this URL already exists" },
        { status: 409 }
      );
    }

    // Create mini app
    let app;
    try {
      // Determine app status
      // If developer is verified/admin, auto-approve
      // If contract address provided, set to pending_contract
      // If reviewMessage provided, set to pending_review for manual review
      // Otherwise, set to pending
      let appStatus = "pending";
      if (developer.verified || developer.isAdmin) {
        appStatus = "approved";
      } else if (validated.contractAddress && validated.contractAddress.trim() !== "") {
        appStatus = "pending_contract";
      } else if (hasReviewMessage) {
        appStatus = "pending_review"; // Manual review requested
      }

      app = await prisma.miniApp.create({
        data: {
          name: validated.name,
          description: validated.description,
          url: validated.url,
          baseMiniAppUrl: (validated.baseMiniAppUrl && validated.baseMiniAppUrl.trim() !== "") ? validated.baseMiniAppUrl : null,
          farcasterUrl: (validated.farcasterUrl && validated.farcasterUrl.trim() !== "") ? validated.farcasterUrl : null,
          iconUrl: (validated.iconUrl && validated.iconUrl.trim() !== "") ? validated.iconUrl : "https://via.placeholder.com/512?text=App+Icon",
          category: validated.category,
          status: appStatus,
          reviewMessage: (validated.reviewMessage && validated.reviewMessage.trim() !== "") ? validated.reviewMessage : null,
          notesToAdmin: (validated.notesToAdmin && validated.notesToAdmin.trim() !== "") ? validated.notesToAdmin : null,
          developerTags: validated.developerTags || [],
          tags: (validated.tags && validated.tags.length > 0) ? validated.tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0) : [],
          contractAddress: (validated.contractAddress && validated.contractAddress.trim() !== "") ? validated.contractAddress.toLowerCase() : null,
          contractVerified: false,
          farcasterJson: farcasterMetadata,
          screenshots: screenshots,
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
      throw dbError;
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
    return NextResponse.json(
      { error: "Failed to submit app" },
      { status: 500 }
    );
  }
}

