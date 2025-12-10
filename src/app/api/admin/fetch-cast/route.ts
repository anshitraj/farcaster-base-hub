import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// Extract cast hash from various Farcaster URL formats
// Extract ONLY the hash (0x followed by hex characters - variable length)
// Regex: /(0x[a-fA-F0-9]+)/ to match any hash length
function extractCastHash(url: string): string | null {
  // Remove query parameters and fragments
  const cleanUrl = url.split('?')[0].split('#')[0];
  
  // Extract hash using regex: /(0x[a-fA-F0-9]+)/
  // This works for ANY Farcaster URL format with variable hash lengths:
  // - https://base.app/post/0x4be7f5431b1b9b8ef54f200fd694b0df1b167aa8 (40 hex chars)
  // - https://warpcast.com/~/casts/0x... (variable length)
  // - https://farcaster.xyz/dwr/0x... (variable length)
  // - Direct hash: 0x4be7f5431b1b9b8ef54f200fd694b0df1b167aa8
  const hashMatch = cleanUrl.match(/(0x[a-fA-F0-9]+)/i);
  
  if (hashMatch && hashMatch[1]) {
    const hash = hashMatch[1];
    // Verify it's a valid hash (0x + at least 8 hex chars = minimum 10 total)
    // Cast hashes can vary in length, so we accept any length >= 10
    if (hash.length >= 10 && /^0x[a-fA-F0-9]{8,}$/i.test(hash)) {
      return hash;
    }
  }

  return null;
}

interface WarpcastCast {
  hash: string;
  author: {
    username: string;
    display_name: string;
    pfp_url?: string;
  };
  text: string;
  embeds?: Array<{
    url?: string;
    cast_id?: {
      hash: string;
    };
  }>;
  timestamp: string;
}

interface WarpcastResponse {
  result?: {
    cast?: WarpcastCast;
  };
  cast?: WarpcastCast;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check admin access
    const developer = await db
      .select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);

    if (!developer[0] || !developer[0].adminRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Extract cast hash from URL using regex: /(0x[a-fA-F0-9]+)/
    const castHash = extractCastHash(url);
    if (!castHash) {
      return NextResponse.json(
        { error: "Invalid cast URL. Please provide a valid Base.app, Warpcast, or Farcaster URL with a cast hash (0x followed by hex characters)." },
        { status: 400 }
      );
    }

    // Verify hash format (0x + at least 8 hex chars = minimum 10 total)
    // Cast hashes can vary in length, so we accept any length >= 10
    if (!/^0x[a-fA-F0-9]{8,}$/i.test(castHash) || castHash.length < 10) {
      return NextResponse.json(
        { error: "Invalid cast hash format. Cast hash must start with 0x followed by at least 8 hex characters." },
        { status: 400 }
      );
    }

    try {
      // Fetch cast from Warpcast API
      // Format: GET https://client.warpcast.com/v2/cast?hash=<hash>
      // NO API key required, NO authentication needed
      const apiUrl = `https://client.warpcast.com/v2/cast?hash=${encodeURIComponent(castHash)}`;
      
      console.log(`[FETCH-CAST] Calling Warpcast API with hash: ${castHash}`);
      console.log(`[FETCH-CAST] Full API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Warpcast API error: ${response.status} - ${errorText}`);
        
        // Try to parse error details
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.message || errorJson.error || errorText;
        } catch {
          // Not JSON, use as-is
        }
        
        if (response.status === 404) {
          return NextResponse.json(
            { error: "Cast not found. The cast may have been deleted or the URL is incorrect." },
            { status: 404 }
          );
        }
        
        if (response.status === 400) {
          return NextResponse.json(
            { 
              error: `Invalid cast hash or API request. ${errorDetails}. Please verify the Base.app URL is correct and try again.`,
              details: errorDetails
            },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { 
            error: `Warpcast API error: ${response.status}. ${errorDetails}. Please try again later or fill in the fields manually.`,
            details: errorDetails
          },
          { status: response.status }
        );
      }

      const data: WarpcastResponse = await response.json();
      
      // Handle different response structures
      const cast = data.result?.cast || data.cast;
      
      if (!cast) {
        return NextResponse.json(
          { error: "No cast data found" },
          { status: 404 }
        );
      }

      // Extract media from embeds
      let mediaUrl: string | null = null;
      if (cast.embeds && cast.embeds.length > 0) {
        const imageEmbed = cast.embeds.find((e) => e.url && !e.cast_id);
        if (imageEmbed?.url) {
          mediaUrl = imageEmbed.url;
        }
      }

      // Use full content (no truncation for admin form, will be truncated on display)
      const content = cast.text || "";

      return NextResponse.json({
        success: true,
        cast: {
          content,
          authorName: cast.author.display_name || null,
          authorHandle: cast.author.username || null, // Don't add @ prefix, let user see raw username
          authorAvatar: cast.author.pfp_url || null,
          mediaUrl,
        },
        source: "warpcast",
      });
    } catch (error: any) {
      console.error("Error fetching cast from Warpcast:", error);
      return NextResponse.json(
        { 
          error: "Could not fetch cast. The cast may be private or unavailable. Please fill in the fields manually.",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching cast:", error);
    return NextResponse.json(
      { error: "Failed to fetch cast", details: error.message },
      { status: 500 }
    );
  }
}

