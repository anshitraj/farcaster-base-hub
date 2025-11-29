// Note: These imports work because tsx resolves paths correctly
// If issues occur, we may need to compile first or use absolute paths
import { searchMiniApps } from "../src/lib/neynar/searchMiniApps";
import { inferCategory, buildTags } from "../src/lib/miniapps/category";
import { getRawDescription, makeShortDescription, makeSeoDescription } from "../src/lib/miniapps/description";
import type { MiniAppCategory, MiniAppSeed } from "../src/types/miniapp";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

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

async function generateSeed(): Promise<MiniAppSeed[]> {
  console.log("🚀 Starting mini apps seed generation...");
  console.log(`📡 Using Neynar search endpoint (free tier)\n`);

  const allFrames: any[] = [];
  const seenUrls = new Set<string>();

  // Fetch frames for each category
  for (const { category, q } of CATEGORY_QUERIES) {
    console.log(`🔍 Searching for ${category} apps (query: "${q}")...`);
    
    try {
      // Search with limit 25 to get a good pool
      const result = await searchMiniApps({
        q,
        limit: 25,
        networks: ["base"],
      });

      // Deduplicate by frames_url
      for (const frame of result.frames) {
        if (frame.frames_url && !seenUrls.has(frame.frames_url)) {
          seenUrls.add(frame.frames_url);
          allFrames.push({ ...frame, _queryCategory: category });
        }
      }

      console.log(`   ✅ Found ${result.frames.length} results (${result.frames.filter(f => f.frames_url && !seenUrls.has(f.frames_url)).length} new)`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`   ❌ Error searching ${category}:`, error.message);
    }
  }

  console.log(`\n📊 Total unique apps found: ${allFrames.length}`);

  // Group by category (filtering to ensure correct category assignment)
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
    console.log(`   ${category}: ${selected.length} apps selected`);
  }

  console.log(`\n🎯 Generating seed data for ${selectedFrames.length} apps...\n`);

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
      console.log(`   ✅ ${name}`);
    } catch (error: any) {
      console.error(`   ❌ Error processing frame:`, error.message);
    }
  }

  return seeds;
}

async function main() {
  try {
    const seeds = await generateSeed();

    // Ensure data directory exists
    const dataDir = resolve(process.cwd(), "data");
    const seedFile = resolve(dataDir, "miniapps-seed.json");

    // Write seed file
    await writeFile(seedFile, JSON.stringify(seeds, null, 2), "utf8");

    console.log(`\n✨ Successfully generated seed file!`);
    console.log(`   📁 Location: ${seedFile}`);
    console.log(`   📦 Total apps: ${seeds.length}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the seed file`);
    console.log(`   2. Click "Sync Featured Mini Apps" in admin panel to import`);
    console.log(`   3. Or use the import API route directly\n`);
  } catch (error: any) {
    console.error("\n❌ Error generating seed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

