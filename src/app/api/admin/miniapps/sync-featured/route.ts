import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin";
import { searchMiniApps } from "@/lib/neynar/searchMiniApps";
import { inferCategory, buildTags } from "@/lib/miniapps/category";
import { getRawDescription, makeShortDescription, makeSeoDescription } from "@/lib/miniapps/description";
import { MiniAppCategory, MiniAppSeed } from "@/types/miniapp";
import { prisma } from "@/lib/db";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";

const CATEGORY_QUERIES: { category: MiniAppCategory; q: string }[] = [
  { category: "game", q: "game" },
  { category: "music", q: "music" },
  { category: "social", q: "social" },
  { category: "productivity", q: "productivity" },
  { category: "finance", q: "finance" },
  { category: "utility", q: "tool" },
];

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

function getBestName(frame: any): string {
  return (
    frame.title ||
    frame.manifest?.miniapp?.name ||
    frame.manifest?.frame?.name ||
    "Untitled Mini App"
  );
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    game: "Games",
    music: "Social",
    social: "Social",
    productivity: "Tools",
    finance: "Finance",
    utility: "Utilities",
    shopping: "Shopping",
  };
  return categoryMap[category] || "Utilities";
}

/**
 * Generate and import mini apps in one API call
 * This replaces the old catalog endpoint with the free search endpoint
 */
export async function POST(request: NextRequest) {
  try {
    await requireModerator();

    console.log("🚀 Starting featured mini apps sync (using free search endpoint)...");

    const allFrames: any[] = [];
    const seenUrls = new Set<string>();

    const searchErrors: string[] = [];
    
    // Fetch frames for each category
    for (const { category, q } of CATEGORY_QUERIES) {
      console.log(`🔍 Searching for ${category} apps (query: "${q}")...`);
      
      try {
        // Try search - first without networks filter to get more results
        // Then filter manually for Base-compatible apps
        let result = await searchMiniApps({
          q,
          limit: 25,
          // networks: ["base"], // Disabled - too restrictive, filter manually instead
        });
        
        // If no results, try with networks filter as fallback
        if ((result.frames || []).length === 0) {
          console.log(`   ⚠️ No results without filter, trying with networks filter...`);
          result = await searchMiniApps({
            q,
            limit: 25,
            networks: ["base"],
          });
        }

        console.log(`   📦 Raw result for ${category}:`, {
          framesCount: result.frames?.length || 0,
          hasFrames: !!result.frames,
          nextCursor: result.nextCursor,
        });

        // Deduplicate by frames_url
        let newFrames = 0;
        for (const frame of result.frames || []) {
          if (frame?.frames_url && !seenUrls.has(frame.frames_url)) {
            seenUrls.add(frame.frames_url);
            allFrames.push({ ...frame, _queryCategory: category });
            newFrames++;
          }
        }

        console.log(`   ✅ Found ${result.frames?.length || 0} results (${newFrames} new unique)`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        const errorMsg = `Error searching ${category} (${q}): ${error.message}`;
        console.error(`   ❌ ${errorMsg}`);
        searchErrors.push(errorMsg);
      }
    }
    
    // Log search summary
    if (searchErrors.length > 0) {
      console.error(`⚠️ Search errors encountered:`, searchErrors);
    }

    console.log(`📊 Total unique apps found: ${allFrames.length}`);
    
    // Early return if no frames found - with detailed error info
    if (allFrames.length === 0) {
      const errorMessage = searchErrors.length > 0 
        ? `Search errors: ${searchErrors.slice(0, 3).join("; ")}${searchErrors.length > 3 ? ` (and ${searchErrors.length - 3} more)` : ""}`
        : "No mini apps were found. The Neynar search API may not have returned results for these queries. Try: 1) Check your NEYNAR_API_KEY, 2) Test the API at /api/admin/miniapps/test-search?q=game, 3) Check Neynar API status";
      
      return NextResponse.json({
        success: false,
        error: "No mini apps found",
        message: errorMessage,
        searchErrors: searchErrors.length > 0 ? searchErrors : undefined,
        debugInfo: {
          categoriesSearched: CATEGORY_QUERIES.map(c => c.q),
          suggestion: "Visit /api/admin/miniapps/test-search?q=game to test the search API directly",
        },
        synced: 0,
        created: 0,
        updated: 0,
      }, { status: 200 }); // Return 200 so UI can show the message
    }

    // Group by category
    const categoryFrames: Record<MiniAppCategory, any[]> = {
      game: [],
      music: [],
      social: [],
      productivity: [],
      finance: [],
      utility: [],
    };

    for (const frame of allFrames) {
      const inferredCategory = inferCategory(frame, frame._queryCategory);
      categoryFrames[inferredCategory].push(frame);
    }

    // Select up to 10 per category
    const selectedFrames: any[] = [];
    for (const category of Object.keys(categoryFrames) as MiniAppCategory[]) {
      const frames = categoryFrames[category];
      const selected = frames.slice(0, 10);
      selectedFrames.push(...selected);
      if (selected.length > 0) {
        console.log(`   📂 ${category}: ${selected.length} apps selected`);
      }
    }

    console.log(`🎯 Processing ${selectedFrames.length} apps...`);
    
    // If still no frames after selection, log category breakdown for debugging
    if (selectedFrames.length === 0 && allFrames.length > 0) {
      console.log("⚠️ All frames filtered out during category selection:");
      for (const category of Object.keys(categoryFrames) as MiniAppCategory[]) {
        console.log(`   ${category}: ${categoryFrames[category].length} frames`);
      }
    }

    // Map to MiniAppSeed
    const seeds: MiniAppSeed[] = [];

    for (const frame of selectedFrames) {
      try {
        const name = getBestName(frame);
        const finalCategory = inferCategory(frame, "utility");
        const rawDescription = getRawDescription(frame);
        const tags = buildTags(frame, finalCategory);

        const miniapp = frame.manifest?.miniapp;
        const frameManifest = frame.manifest?.frame;
        const metadata = frame.metadata;

        const seed: MiniAppSeed = {
          name,
          slug: createSlug(name),
          category: finalCategory,
          frameUrl: frame.frames_url,
          homeUrl:
            miniapp?.home_url ||
            frameManifest?.home_url ||
            frame.frames_url ||
            null,
          iconUrl:
            miniapp?.icon_url ||
            frameManifest?.icon_url ||
            metadata?.html?.favicon ||
            null,
          bannerUrl:
            miniapp?.hero_image_url ||
            frameManifest?.hero_image_url ||
            miniapp?.screenshot_urls?.[0] ||
            frameManifest?.screenshot_urls?.[0] ||
            frame.image ||
            null,
          shortDescription: makeShortDescription(rawDescription, finalCategory),
          seoDescription: makeSeoDescription(rawDescription, finalCategory, name),
          primaryNetwork: "base",
          networks: ["base"],
          tags,
          isFeatured: true,
        };

        seeds.push(seed);
      } catch (error: any) {
        console.error(`   ❌ Error processing frame:`, error.message);
      }
    }

    // Save to seed file
    const dataDir = resolve(process.cwd(), "data");
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
    const seedFile = resolve(dataDir, "miniapps-seed.json");
    await writeFile(seedFile, JSON.stringify(seeds, null, 2), "utf8");

    // Import into database
    const defaultDeveloperWallet = DEFAULT_OWNER_ADDRESS.toLowerCase();
    
    let developer = await prisma.developer.findUnique({
      where: { wallet: defaultDeveloperWallet },
    });

    if (!developer) {
      developer = await prisma.developer.create({
        data: {
          wallet: defaultDeveloperWallet,
          name: "System",
          verified: true,
        },
      });
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const seed of seeds) {
      try {
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
          await prisma.miniApp.update({
            where: { id: existingApp.id },
            data: appData,
          });
          updated++;
        } else {
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
              }
            }
          }
        }
      } catch (error: any) {
        errors.push(`Failed to process ${seed.name}: ${error.message}`);
      }
    }

    // Provide detailed response
    const response: any = {
      success: true,
      message: seeds.length > 0 
        ? `Synced ${seeds.length} featured mini-apps from Neynar search (free tier)`
        : "No apps found. Check console logs for details.",
      synced: seeds.length,
      created,
      updated,
    };

    if (searchErrors.length > 0) {
      response.searchErrors = searchErrors;
    }
    
    if (errors.length > 0) {
      response.processingErrors = errors;
    }
    
    if (seeds.length === 0) {
      response.details = {
        totalFramesFound: allFrames.length,
        selectedFrames: selectedFrames.length,
        suggestion: "Try different search terms or check Neynar API status. Test the search API at /api/admin/miniapps/test-search?q=game"
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Sync featured miniapps error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync featured mini-apps",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

