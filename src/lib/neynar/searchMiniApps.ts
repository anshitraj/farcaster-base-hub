// Import from root config directory
const NEYNAR_API_BASE = "https://api.neynar.com";
const NEYNAR_MINIAPP_SEARCH_PATH = "/v2/farcaster/frame/search/";

function getNeynarHeaders(): Record<string, string> {
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEYNAR_API_KEY environment variable is not configured. " +
      "Please add it to your .env.local file. " +
      "Get your API key from https://neynar.com"
    );
  }

  return {
    "x-api-key": apiKey,
    "Accept": "application/json",
  };
}

export interface NeynarFrame {
  frames_url: string;
  title: string | null;
  image: string | null;
  manifest?: {
    frame?: {
      name?: string;
      home_url?: string;
      icon_url?: string;
      image_url?: string;
      description?: string;
      subtitle?: string;
      screenshot_urls?: string[];
      primary_category?: string;
      tags?: string[];
      hero_image_url?: string;
      tagline?: string;
      og_title?: string;
      og_description?: string;
      og_image_url?: string;
    };
    miniapp?: {
      name?: string;
      home_url?: string;
      icon_url?: string;
      image_url?: string;
      description?: string;
      subtitle?: string;
      screenshot_urls?: string[];
      primary_category?: string;
      tags?: string[];
      hero_image_url?: string;
      tagline?: string;
      og_title?: string;
      og_description?: string;
      og_image_url?: string;
    };
  };
  metadata?: {
    html?: {
      favicon?: string;
    };
  };
}

export interface SearchMiniAppsParams {
  q: string;
  limit?: number;
  networks?: string[];
  cursor?: string;
}

export interface SearchMiniAppsResult {
  frames: NeynarFrame[];
  nextCursor?: string;
}

/**
 * Search for mini apps using Neynar's free search endpoint
 * Uses /v2/farcaster/frame/search/ instead of the paid catalog endpoint
 */
export async function searchMiniApps({
  q,
  limit = 20,
  networks = ["base"],
  cursor,
}: SearchMiniAppsParams): Promise<SearchMiniAppsResult> {
  const url = new URL(`${NEYNAR_API_BASE}${NEYNAR_MINIAPP_SEARCH_PATH}`);
  
  url.searchParams.set("q", q);
  url.searchParams.set("limit", limit.toString());
  
  // Note: networks filter might be too restrictive - try without it if no results
  // The search API might work better with broader queries
  if (networks && networks.length > 0) {
    // Only add networks filter if specified (can be too restrictive)
    // Comment out if search returns no results
    networks.forEach(network => {
      url.searchParams.append("networks", network);
    });
  }
  
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const headers = getNeynarHeaders();

  try {
    const response = await fetch(url.toString(), {
      headers,
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Neynar search error:", response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Neynar API authentication failed (${response.status}). ` +
          "Please check your NEYNAR_API_KEY in .env.local"
        );
      }
      
      if (response.status === 429) {
        throw new Error(
          "Neynar API rate limit exceeded. Please wait a moment and try again."
        );
      }

      throw new Error(
        `Neynar search failed: ${response.statusText} (${response.status}). ` +
        errorText.substring(0, 200)
      );
    }

    const data = await response.json();
    
    // Debug logging - check what we actually got
    console.log("Neynar search API response structure:", {
      keys: Object.keys(data),
      hasFrames: !!data.frames,
      framesType: typeof data.frames,
      framesLength: Array.isArray(data.frames) ? data.frames.length : "not an array",
      query: q,
    });
    
    // Handle different possible response structures
    // The API might return frames directly or in a nested structure
    let frames: any[] = [];
    let nextCursor: string | undefined;
    
    if (Array.isArray(data)) {
      // Response is directly an array
      frames = data;
    } else if (Array.isArray(data.frames)) {
      // Standard response with frames array
      frames = data.frames;
      nextCursor = data.next?.cursor;
    } else if (Array.isArray(data.results)) {
      // Alternative response format
      frames = data.results;
      nextCursor = data.next?.cursor;
    } else if (data.data && Array.isArray(data.data)) {
      // Nested data structure
      frames = data.data;
      nextCursor = data.next?.cursor;
    }
    
    console.log(`Parsed ${frames.length} frames from response`);
    
    return {
      frames,
      nextCursor,
    };
  } catch (error: any) {
    if (error.message.includes("NEYNAR_API_KEY")) {
      throw error;
    }
    throw new Error(
      `Failed to search mini apps: ${error.message || "Unknown error"}`
    );
  }
}

