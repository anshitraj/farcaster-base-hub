/**
 * DEPRECATED: This endpoint used the paid Neynar catalog API.
 * 
 * Use /api/admin/miniapps/sync-featured instead, which uses the FREE search endpoint.
 * 
 * This file is kept for reference but is no longer used by the admin UI.
 * The "Sync Featured Mini Apps" button now calls /api/admin/miniapps/sync-featured
 * 
 * NOTE: This file uses Prisma syntax but project uses Drizzle - needs conversion or removal
 */

// @ts-nocheck - Legacy Prisma code, needs conversion to Drizzle
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";

/**
 * @deprecated Use /api/admin/miniapps/sync-featured instead
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "NEYNAR_API_KEY is not configured in environment variables" },
        { status: 500 }
      );
    }

    // Fetch from Neynar API with Base network filter
    const neynarUrl = new URL("https://api.neynar.com/v2/farcaster/frame/catalog");
    neynarUrl.searchParams.set("limit", "50");
    neynarUrl.searchParams.set("networks", "base");

    const response = await fetch(neynarUrl.toString(), {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Neynar API error:", response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: "Invalid API key or unauthorized access to Neynar API. Please check your NEYNAR_API_KEY in .env.local" },
          { status: 401 }
        );
      }
      
      if (response.status === 402) {
        return NextResponse.json(
          { 
            error: "Neynar API requires a paid plan for catalog access",
            message: "The Frame Catalog API endpoint requires a paid Neynar subscription. Please upgrade your plan at https://neynar.com or use a different API key with catalog access.",
            details: "You can still manually add apps or use the Auto Import feature instead."
          },
          { status: 402 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: `Failed to fetch from Neynar API: ${response.statusText}`,
          statusCode: response.status,
          details: errorText || "Please check your API key and try again."
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const frames = data.frames || [];

    if (frames.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No mini-apps found",
        synced: 0,
        updated: 0,
        created: 0,
      });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process each frame
    for (const frame of frames) {
      try {
        // Validate required fields
        const framesUrl = frame.frames_url || frame.manifest?.miniapp?.home_url || frame.manifest?.frame?.home_url;
        
        if (!framesUrl) {
          console.warn("Skipping frame: no URL found", frame);
          errors.push("Skipped frame: missing URL");
          continue;
        }

        // Validate URL format
        try {
          new URL(framesUrl);
        } catch {
          console.warn("Skipping frame: invalid URL", framesUrl);
          errors.push(`Skipped frame: invalid URL ${framesUrl}`);
          continue;
        }

        const title = frame.title || 
                     frame.manifest?.miniapp?.name || 
                     frame.manifest?.frame?.name || 
                     "Untitled App";
        
        const image = frame.image || 
                     frame.manifest?.miniapp?.icon_url || 
                     frame.manifest?.frame?.icon_url ||
                     null;
        
        const description = frame.manifest?.miniapp?.description || 
                           frame.manifest?.frame?.description || 
                           frame.manifest?.miniapp?.subtitle ||
                           frame.manifest?.frame?.subtitle ||
                           "";
        
        // Extract category
        const primaryCategory = frame.manifest?.miniapp?.primary_category || 
                               frame.manifest?.frame?.primary_category || 
                               "Utilities";
        
        // Extract tags
        const tags = (frame.manifest?.miniapp?.tags || 
                     frame.manifest?.frame?.tags || 
                     []).filter((t: any) => t && typeof t === "string");
        
        // Extract screenshots
        const screenshots = (frame.manifest?.miniapp?.screenshot_urls || 
                           frame.manifest?.frame?.screenshot_urls || 
                           []).filter((s: any) => s && typeof s === "string");
        
        // Extract developer info
        const author = frame.author;
        const developerWallet = author?.verified_addresses?.primary?.eth_address || 
                               (author?.custody_address ? `0x${author.custody_address}` : null) ||
                               (author?.fid ? `farcaster:${author.fid}` : null);
        
        if (!developerWallet) {
          console.warn("Skipping frame: no developer wallet found", frame);
          errors.push(`Skipped ${title}: no developer wallet found`);
          continue;
        }
        
        const developerName = author?.display_name || 
                             author?.username || 
                             "Unknown Developer";

        // Get or create developer
        const normalizedWallet = developerWallet.toLowerCase();
        let developer = await prisma.developer.findUnique({
          where: { wallet: normalizedWallet },
        });

        if (!developer) {
          developer = await prisma.developer.create({
            data: {
              wallet: normalizedWallet,
              name: developerName,
              avatar: author?.pfp_url || null,
              verified: (author?.verified_addresses?.eth_addresses?.length || 0) > 0 || false,
              bio: author?.profile?.bio?.text || null,
            },
          });
        } else {
          // Update developer info if available
          const updates: any = {};
          if (author?.pfp_url && !developer.avatar) {
            updates.avatar = author.pfp_url;
          }
          if (author?.profile?.bio?.text && !developer.bio) {
            updates.bio = author.profile.bio.text;
          }
          if (Object.keys(updates).length > 0) {
            await prisma.developer.update({
              where: { id: developer.id },
              data: updates,
            });
          }
        }

        // Create manifest JSON with owner address
        const manifestWithOwner = {
          ...frame.manifest,
          owner: DEFAULT_OWNER_ADDRESS,
          owners: DEFAULT_OWNER_ADDRESS,
        };
        const farcasterJson = JSON.stringify(manifestWithOwner);

        // Map category to our categories
        const categoryMap: Record<string, string> = {
          "games": "Games",
          "social": "Social",
          "finance": "Finance",
          "utility": "Utilities",
          "productivity": "Tools",
          "health-fitness": "Utilities",
          "news-media": "Social",
          "music": "Social",
          "shopping": "Shopping",
          "education": "Tools",
          "developer-tools": "Tools",
          "entertainment": "Games",
          "art-creativity": "Utilities",
        };

        const mappedCategory = categoryMap[primaryCategory.toLowerCase()] || primaryCategory || "Utilities";

        // Check if app exists (by URL) - try to normalize URL
        const normalizedUrl = framesUrl.endsWith("/") ? framesUrl.slice(0, -1) : framesUrl;
        let existingApp = await prisma.miniApp.findUnique({
          where: { url: normalizedUrl },
        });

        // Also check by farcasterUrl if not found
        if (!existingApp) {
          existingApp = await prisma.miniApp.findFirst({
            where: {
              OR: [
                { url: normalizedUrl },
                { farcasterUrl: normalizedUrl },
              ],
            },
          });
        }

        const appData = {
          name: title.substring(0, 100), // Ensure name doesn't exceed DB limit
          description: (description || `${title} - A Farcaster mini app`).substring(0, 500), // Ensure description doesn't exceed DB limit
          url: normalizedUrl,
          farcasterUrl: normalizedUrl,
          baseMiniAppUrl: null,
          iconUrl: image || "/placeholder-icon.png",
          headerImageUrl: (frame.manifest?.miniapp?.hero_image_url || 
                         frame.manifest?.frame?.hero_image_url || 
                         frame.manifest?.miniapp?.image_url ||
                         frame.manifest?.frame?.image_url ||
                         image ||
                         null)?.substring(0, 500) || null,
          category: mappedCategory,
          tags: tags.map((t: string) => t.toLowerCase().trim()).slice(0, 10), // Limit tags
          screenshots: screenshots.slice(0, 10), // Limit screenshots
          farcasterJson: farcasterJson,
          developerId: developer.id,
          status: "approved" as const,
          verified: true,
          autoUpdated: true,
          lastUpdatedAt: new Date(),
        };

        if (existingApp) {
          // Update existing app
          await prisma.miniApp.update({
            where: { id: existingApp.id },
            data: appData,
          });
          updated++;
        } else {
          // Create new app
          try {
            await prisma.miniApp.create({
              data: {
                ...appData,
                clicks: 0,
                installs: 0,
                launchCount: 0,
                uniqueUsers: 0,
                popularityScore: 0,
                ratingAverage: 0,
                ratingCount: 0,
              },
            });
            created++;
          } catch (createError: any) {
            // Handle unique constraint violations
            if (createError.code === "P2002") {
              // URL already exists, try to update instead
              existingApp = await prisma.miniApp.findUnique({
                where: { url: normalizedUrl },
              });
              if (existingApp) {
                await prisma.miniApp.update({
                  where: { id: existingApp.id },
                  data: appData,
                });
                updated++;
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          }
        }
      } catch (error: any) {
        console.error(`Error processing frame ${frame.frames_url}:`, error);
        errors.push(`Failed to process ${frame.title || frame.frames_url}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${frames.length} mini-apps from Neynar`,
      synced: frames.length,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Neynar sync error:", error);
    return NextResponse.json(
      { 
        error: "Failed to sync mini-apps",
        message: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}
