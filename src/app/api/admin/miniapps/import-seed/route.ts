import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireModerator } from "@/lib/admin";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { MiniAppSeed } from "@/types/miniapp";

const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";

// Map MiniAppCategory to our database category strings
function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    game: "Games",
    music: "Social", // Music apps go in Social category
    social: "Social",
    productivity: "Tools",
    finance: "Finance",
    utility: "Utilities",
    shopping: "Shopping",
  };
  return categoryMap[category] || "Utilities";
}

export async function POST(request: NextRequest) {
  try {
    await requireModerator();

    // Read seed file from data directory
    const seedFilePath = resolve(process.cwd(), "data", "miniapps-seed.json");
    
    let seeds: MiniAppSeed[];
    try {
      const fileContent = await readFile(seedFilePath, "utf-8");
      seeds = JSON.parse(fileContent);
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: "Failed to read seed file",
          message: error.message || "Please run 'npm run generate:miniapps' first to create the seed file"
        },
        { status: 404 }
      );
    }

    if (!Array.isArray(seeds) || seeds.length === 0) {
      return NextResponse.json(
        { error: "Seed file is empty or invalid format" },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process each seed
    for (const seed of seeds) {
      try {
        // Get or create developer - use a default system developer for imported apps
        // In a real scenario, you might want to extract developer info from seed
        const defaultDeveloperWallet = DEFAULT_OWNER_ADDRESS.toLowerCase();
        
        let developer = await prisma.developer.findUnique({
          where: { wallet: defaultDeveloperWallet },
        });

        if (!developer) {
          developer = await prisma.developer.create({
            data: {
              wallet: defaultDeveloperWallet,
              name: "MiniCast Admin",
              verified: true,
            },
          });
        }

        // Check if app exists (by URL or slug if we want to use slug)
        const existingApp = await prisma.miniApp.findUnique({
          where: { url: seed.frameUrl },
        });

        const mappedCategory = mapCategory(seed.category);
        const normalizedUrl = seed.frameUrl.endsWith("/") 
          ? seed.frameUrl.slice(0, -1) 
          : seed.frameUrl;

        const appData = {
          name: seed.name.substring(0, 100),
          description: seed.seoDescription.substring(0, 500),
          url: normalizedUrl,
          farcasterUrl: seed.frameUrl,
          baseMiniAppUrl: seed.homeUrl || null,
          iconUrl: seed.iconUrl || "/placeholder-icon.png",
          headerImageUrl: seed.bannerUrl || null,
          category: mappedCategory,
          tags: seed.tags.slice(0, 10),
          screenshots: seed.bannerUrl ? [seed.bannerUrl] : [],
          farcasterJson: JSON.stringify({
            owner: DEFAULT_OWNER_ADDRESS,
            owners: DEFAULT_OWNER_ADDRESS,
            name: seed.name,
            description: seed.seoDescription,
            icon: seed.iconUrl,
            url: seed.homeUrl || seed.frameUrl,
          }),
          developerId: developer.id,
          status: "approved" as const,
          verified: true,
          autoUpdated: true,
          lastUpdatedAt: new Date(),
          featuredInBanner: seed.isFeatured,
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
              const updatedApp = await prisma.miniApp.findUnique({
                where: { url: normalizedUrl },
              });
              if (updatedApp) {
                await prisma.miniApp.update({
                  where: { id: updatedApp.id },
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
        console.error(`Error processing seed ${seed.name}:`, error);
        errors.push(`Failed to process ${seed.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${seeds.length} mini-apps from seed file`,
      created,
      updated,
      total: seeds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Import seed error:", error);
    return NextResponse.json(
      {
        error: "Failed to import mini-apps from seed",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

